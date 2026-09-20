import { v } from 'convex/values';

import { requireUserId } from './_helpers';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/**
 * Shopping lists, and who is allowed in them.
 *
 * The cart used to be a flat pile of rows owned by one person. Sharing turns it
 * into an object with members, which changes the security question from "is
 * this row yours?" to "are you in this list?" — every cart function now asks
 * the latter, and getting that wrong leaks one household's shopping to another.
 *
 * Everyone has exactly one list until they create or join another, so the
 * common case stays invisible: you open the cart, your things are there.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// No I, O, 0 or 1 — these get read aloud and typed in by someone in a kitchen.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Throws unless the user is a member. The single gate for every list read/write. */
export async function requireMembership(
  ctx: QueryCtx | MutationCtx,
  listId: Id<'shoppingLists'>,
  userId: string,
): Promise<void> {
  const membership = await ctx.db
    .query('listMembers')
    .withIndex('by_list_and_user', (q) => q.eq('listId', listId).eq('userId', userId))
    .unique();
  if (!membership) throw new Error('That list is not shared with you.');
}

/**
 * The list a user is currently shopping from, creating their personal one on
 * first use and adopting any pre-sharing cart rows they already had.
 *
 * Migration happens here rather than in a one-off script because it has to be
 * idempotent and lazy: someone who hasn't opened the app since the change
 * still has loose rows, and they should find them waiting rather than gone.
 */
export async function getOrCreateActiveList(
  ctx: MutationCtx,
  userId: string,
): Promise<Id<'shoppingLists'>> {
  const existing = await ctx.db
    .query('listMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
  if (existing) return existing.listId;

  const listId = await ctx.db.insert('shoppingLists', {
    name: 'My shopping list',
    ownerId: userId,
    createdAt: Date.now(),
  });
  await ctx.db.insert('listMembers', {
    listId,
    userId,
    role: 'owner',
    joinedAt: Date.now(),
  });

  // Adopt anything from before lists existed.
  const orphans = await ctx.db
    .query('cartItems')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const row of orphans) {
    if (row.listId == null) await ctx.db.patch(row._id, { listId });
  }

  return listId;
}

/* -------------------------------------------------------------------------- */

export const myLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query('listMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const lists = [];
    for (const m of memberships) {
      const list = await ctx.db.get(m.listId);
      if (!list) continue;
      const members = await ctx.db
        .query('listMembers')
        .withIndex('by_list', (q) => q.eq('listId', m.listId))
        .collect();
      lists.push({
        id: m.listId,
        name: list.name,
        role: m.role,
        memberCount: members.length,
        isOwner: list.ownerId === userId,
      });
    }
    return lists;
  },
});

/** Creates the personal list on demand, so the cart screen always has one. */
export const ensureList = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return getOrCreateActiveList(ctx, userId);
  },
});

export const rename = mutation({
  args: { listId: v.id('shoppingLists'), name: v.string() },
  handler: async (ctx, { listId, name }) => {
    const userId = await requireUserId(ctx);
    await requireMembership(ctx, listId, userId);
    const clean = name.trim().slice(0, 60);
    if (clean) await ctx.db.patch(listId, { name: clean });
  },
});

/* -------------------------------------------------------------------------- */

export const createInvite = mutation({
  args: { listId: v.id('shoppingLists') },
  handler: async (ctx, { listId }) => {
    const userId = await requireUserId(ctx);
    await requireMembership(ctx, listId, userId);

    // One live invite per list: re-issuing replaces the old code rather than
    // leaving a trail of working ones nobody remembers handing out.
    const old = await ctx.db
      .query('listInvites')
      .withIndex('by_list', (q) => q.eq('listId', listId))
      .collect();
    for (const o of old) await ctx.db.delete(o._id);

    const code = makeCode();
    await ctx.db.insert('listInvites', {
      code,
      listId,
      createdBy: userId,
      expiresAt: Date.now() + INVITE_TTL_MS,
    });
    return { code, expiresAt: Date.now() + INVITE_TTL_MS };
  },
});

export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUserId(ctx);
    const invite = await ctx.db
      .query('listInvites')
      .withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase()))
      .unique();

    if (!invite) throw new Error("That code doesn't match any list.");
    if (Date.now() > invite.expiresAt) {
      throw new Error('That code has expired. Ask for a new one.');
    }

    const already = await ctx.db
      .query('listMembers')
      .withIndex('by_list_and_user', (q) =>
        q.eq('listId', invite.listId).eq('userId', userId),
      )
      .unique();
    if (already) return invite.listId;

    await ctx.db.insert('listMembers', {
      listId: invite.listId,
      userId,
      role: 'member',
      joinedAt: Date.now(),
    });
    return invite.listId;
  },
});

export const leave = mutation({
  args: { listId: v.id('shoppingLists') },
  handler: async (ctx, { listId }) => {
    const userId = await requireUserId(ctx);
    const membership = await ctx.db
      .query('listMembers')
      .withIndex('by_list_and_user', (q) => q.eq('listId', listId).eq('userId', userId))
      .unique();
    if (!membership) return;

    // The owner leaving would strand everyone else in a list nobody can manage,
    // so they have to hand it over or delete it instead.
    if (membership.role === 'owner') {
      throw new Error("You own this list — delete it instead of leaving.");
    }
    await ctx.db.delete(membership._id);
  },
});
