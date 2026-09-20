import { v } from 'convex/values';

import { requireUserId } from './_helpers';
import { mutation, query } from './_generated/server';
import { getOrCreateActiveList, requireMembership } from './shoppingLists';

/**
 * The shopping list's contents.
 *
 * Every function here used to ask "is this row yours?". Now it asks "are you in
 * this list?" — because a shared list means rows your housemate added are
 * legitimately yours to tick off. Getting that check wrong in either direction
 * either breaks sharing or leaks one household's shopping to another, so it
 * goes through requireMembership and nothing else.
 */

export const list = query({
  args: { listId: v.optional(v.id('shoppingLists')) },
  handler: async (ctx, { listId }) => {
    const userId = await requireUserId(ctx);

    // No list yet — a query can't create one, so fall back to the legacy view.
    // The cart screen calls ensureList on mount, so this is the first-render
    // case only.
    if (!listId) {
      const membership = await ctx.db
        .query('listMembers')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .first();
      if (!membership) {
        return ctx.db
          .query('cartItems')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .collect();
      }
      return ctx.db
        .query('cartItems')
        .withIndex('by_list', (q) => q.eq('listId', membership.listId))
        .collect();
    }

    await requireMembership(ctx, listId, userId);
    return ctx.db
      .query('cartItems')
      .withIndex('by_list', (q) => q.eq('listId', listId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    quantity: v.optional(v.string()),
    fromRecipeId: v.optional(v.string()),
    listId: v.optional(v.id('shoppingLists')),
  },
  handler: async (ctx, { listId, ...item }) => {
    const userId = await requireUserId(ctx);
    const target = listId ?? (await getOrCreateActiveList(ctx, userId));
    await requireMembership(ctx, target, userId);
    return ctx.db.insert('cartItems', {
      ...item,
      userId,
      listId: target,
      checked: false,
    });
  },
});

export const addMany = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.optional(v.string()),
        fromRecipeId: v.optional(v.string()),
      }),
    ),
    listId: v.optional(v.id('shoppingLists')),
  },
  handler: async (ctx, { items, listId }) => {
    const userId = await requireUserId(ctx);
    const target = listId ?? (await getOrCreateActiveList(ctx, userId));
    await requireMembership(ctx, target, userId);
    for (const item of items) {
      await ctx.db.insert('cartItems', { ...item, userId, listId: target, checked: false });
    }
  },
});

export const toggle = mutation({
  args: { id: v.id('cartItems') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item) return;
    await assertMayTouch(ctx, item, userId);
    await ctx.db.patch(id, { checked: !item.checked });
  },
});

export const remove = mutation({
  args: { id: v.id('cartItems') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item) return;
    await assertMayTouch(ctx, item, userId);
    await ctx.db.delete(id);
  },
});

export const clearChecked = mutation({
  args: { listId: v.optional(v.id('shoppingLists')) },
  handler: async (ctx, { listId }) => {
    const userId = await requireUserId(ctx);
    const target = listId ?? (await getOrCreateActiveList(ctx, userId));
    await requireMembership(ctx, target, userId);

    const rows = await ctx.db
      .query('cartItems')
      .withIndex('by_list', (q) => q.eq('listId', target))
      .collect();
    for (const r of rows) {
      if (r.checked) await ctx.db.delete(r._id);
    }
  },
});

/**
 * A row belongs to a list, except for the ones written before lists existed,
 * which only carry a userId. Both have to keep working until every account has
 * opened the app once and been migrated.
 */
async function assertMayTouch(
  ctx: Parameters<typeof requireMembership>[0],
  item: { userId: string; listId?: import('./_generated/dataModel').Id<'shoppingLists'> },
  userId: string,
): Promise<void> {
  if (item.listId) {
    await requireMembership(ctx, item.listId, userId);
    return;
  }
  if (item.userId !== userId) throw new Error('That item is not yours.');
}
