import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { atom } from '@reatom/core'
import { createTestCtx } from '@reatom/testing'
import { noop } from '@reatom/utils'

import { createMemStorage, reatomPersist } from './'

const withSomePersist = reatomPersist(createMemStorage({ name: 'test' }))

test('base', async () => {
  const a1 = atom(0).pipe(withSomePersist('a1'))
  const a2 = atom(0).pipe(withSomePersist('a2'))

  const ctx = createTestCtx()
  withSomePersist.storageAtom(
    ctx,
    createMemStorage({
      name: 'test',
      snapshot: {
        a1: 1,
        a2: 2,
      },
    }),
  )

  assert.is(ctx.get(a1), 1)
  assert.is(ctx.get(a2), 2)

  a1(ctx, 11)
  assert.is(ctx.get(a1), 11)
  assert.is(ctx.get(a2), 2)
  assert.is(ctx.get(withSomePersist.storageAtom).get(ctx, 'a1')?.data, 11)

  ctx.get(() => {
    a1(ctx, 12)
    // it is important to not miss an update because of some sort of caching or batching
    a1(ctx, (state) => (state ? state : state))
  })
  assert.is(ctx.get(a1), 12)
  assert.is(ctx.get(withSomePersist.storageAtom).get(ctx, 'a1')?.data, 12)
  ;('👍') //?
})

test('async', async () => {
  let trigger = noop
  const number1Atom = atom(0).pipe(withSomePersist({ key: 'test' }))
  const number2Atom = atom(0).pipe(withSomePersist({ key: 'test' }))

  const ctx = createTestCtx()
  withSomePersist.storageAtom(ctx, (storage) => ({
    ...storage,
    async set(ctx, key, rec) {
      await new Promise((resolve) => (trigger = resolve))
      storage.set(ctx, key, rec)
    },
  }))
  const track = ctx.subscribeTrack(number2Atom)
  track.calls.length = 0

  assert.is(ctx.get(number1Atom), 0)
  assert.is(ctx.get(number2Atom), 0)

  number1Atom(ctx, 11)
  assert.is(ctx.get(number1Atom), 11)
  assert.is(ctx.get(number2Atom), 0)
  assert.is(track.calls.length, 0)
  await null
  assert.is(ctx.get(number2Atom), 0)
  assert.is(track.calls.length, 0)

  trigger()
  await null

  assert.is(track.calls.length, 1)
  assert.is(track.lastInput(), 11)
  ;('👍') //?
})

test('should not skip double update', async () => {
  const a1 = atom(0).pipe(withSomePersist('a1'))
  const a2 = atom(0).pipe(withSomePersist('a2'))

  const ctx = createTestCtx()
  withSomePersist.storageAtom(
    ctx,
    createMemStorage({
      name: 'test',
      snapshot: {
        a1: 1,
        a2: 2,
      },
    }),
  )

  assert.is(ctx.get(a1), 1)
  assert.is(ctx.get(a2), 2)

  a1(ctx, 11)
  assert.is(ctx.get(a1), 11)
  assert.is(ctx.get(a2), 2)
  ;('👍') //?
})

test.run()
