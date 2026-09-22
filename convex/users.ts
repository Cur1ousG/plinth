import { requireUserId } from './_helpers';
import { mutation } from './_generated/server';

/**
 * Delete every Convex row belonging to the calling user.
 *
 * Caller must be authenticated. The Clerk account itself is not deleted here —
 * the client calls user.delete() on Clerk once this resolves, which removes the
 * name, email address and profile picture.
 *
 * "Delete my data" is a promise we make on the store listing and in the privacy
 * policy, so anything added to the schema later belongs in here too.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const wipe = async (
      table: 'savedRecipes' | 'cartItems' | 'calendarEntries' | 'subscriptions' | 'userProfiles',
    ) => {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    };

    await wipe('savedRecipes');
    // Removes items they added anywhere, including on a household list.
    await wipe('cartItems');
    await wipe('calendarEntries');
    await wipe('subscriptions');
    // Onboarding and trial start.
    await wipe('userProfiles');

    /**
     * Shopping lists need care, because one can be shared with other people.
     *
     * Lists this person owns go completely — with their items, invites and
     * everyone's membership of them — since leaving a list behind whose owner
     * no longer exists would strand it. Lists owned by someone else survive;
     * only this person's membership is removed, so a housemate doesn't lose
     * their shopping because someone else closed their account.
     */
    const memberships = await ctx.db
      .query('listMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    for (const membership of memberships) {
      const list = await ctx.db.get(membership.listId);

      if (list && list.ownerId === userId) {
        for (const item of await ctx.db
          .query('cartItems')
          .withIndex('by_list', (q) => q.eq('listId', membership.listId))
          .collect()) {
          await ctx.db.delete(item._id);
        }
        for (const invite of await ctx.db
          .query('listInvites')
          .withIndex('by_list', (q) => q.eq('listId', membership.listId))
          .collect()) {
          await ctx.db.delete(invite._id);
        }
        for (const member of await ctx.db
          .query('listMembers')
          .withIndex('by_list', (q) => q.eq('listId', membership.listId))
          .collect()) {
          await ctx.db.delete(member._id);
        }
        await ctx.db.delete(list._id);
      } else {
        await ctx.db.delete(membership._id);
      }
    }

    // Rate-limit counters are keyed "<userId>:<bucket>" rather than by a userId
    // column, so clear them with a prefix range scan. They'd expire on their own,
    // but "delete my data" should mean it.
    const limitRows = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) => q.gte('key', `${userId}:`).lt('key', `${userId}:￿`))
      .collect();
    for (const row of limitRows) {
      await ctx.db.delete(row._id);
    }
  },
});
