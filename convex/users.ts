import { requireUserId } from './_helpers';
import { mutation } from './_generated/server';

/**
 * Delete every Convex row owned by the calling user.
 * Caller must be authenticated. We do NOT delete the Clerk auth account here —
 * the client calls user.delete() on Clerk after this resolves.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const wipe = async (
      table: 'savedRecipes' | 'cartItems' | 'calendarEntries' | 'subscriptions',
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
    await wipe('cartItems');
    await wipe('calendarEntries');
    await wipe('subscriptions');

    // Rate-limit counters are keyed "<userId>:<bucket>" rather than by a userId
    // column, so clear them with a prefix range scan. They'd expire on their own,
    // but "delete my data" should mean it.
    const limitRows = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) =>
        q.gte('key', `${userId}:`).lt('key', `${userId}:￿`),
      )
      .collect();
    for (const row of limitRows) {
      await ctx.db.delete(row._id);
    }
  },
});
