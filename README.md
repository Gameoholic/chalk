# Chalk - Online Whiteboard

> An infinite modern canvas board app, allowing users to create whiteboards and save them on the cloud. Doesn't require creating an account.

**Backend:** Node.js, Express, MongoDB, JWT  
**Frontend:** React, Vite, TailwindCSS

Try it here:
chalk.gameoholic.dev

## Features

- Allow users to store boards on the database without having to create an account.
- Custom authentication solution via JWT and DB refresh tokens, passwords hashed & salted
- Error handling with queued object changes and automatic retrying, data-efficient auto-save of data.
- Server written with best practices: (MVC, authentication & authorization, exhaustive type-safe error handling using discriminated unions with Typescript's `satisfies`)

## Planned Features & Fixes

#### 🧩 Collaborative real-time board sharing
- [ ] Invite collaborators to board (with link)
- [ ] Manage board's collaborators (kick, see last access timestamp)

#### 🖌️ Canvas
- [ ] Create boards
- [ ] Eraser tool
- [ ] Edit specific objects (color, stroke, move..)
- [ ] Delete specific objects
- [ ] Snap camera zoom
- [ ] Delete board

#### 🎨 Visual & Polish & QOL
- [ ] Better light mode
- [ ] Keybinds in bottom left corner ([Shift] Move [LMB] Draw)
- [ ] Make lastOpen property of board nullable, so when we create the board it doesn't automatically set its lastOpened to now
- [ ] Unify style app-wide

#### 🔒 Security
- [ ] Server-side ratelimiting
- [ ] Hash password on client before sending it to server
- [ ] Bring back and fix object save client-side ratelimit: requestSaveObjectsOnDatabase()
- [ ] Ensure users' emails are unique
- [ ] Refresh tokens database should contain user id, so upon changing password we will log all users out
- [ ] IP log and send email when logging in from different IP
- [ ] Process boards to make sure there's no data that would crash client (invalid colors, invalid shape or rectangle with negative length etc. ellipse negative radius etc.)
- [ ] Ensure objects are valid (no objects with 1m points, etc.)
- [ ] Object limit on upsert doesn't work

#### 👤 Accounts
- [ ] Manage account: Log out
- [ ] Manage account: Change displayname
- [ ] Send verification email on sign-up
- [ ] Forgot password
- [ ] OAuth

#### ⚡ Performance
- [ ] Divide boards into 'zones' - only load necessary zones
- [ ] Auto-share of objects with websockets is dynamic - if server is lagging, slow down rate, otherwise, speed it up
- [ ] Pagination for my boards
- [ ] Don't update board's last camera properties every frame. Do it at the same time as object save. (in fact, put their logic in the same function)

#### 🐞 Bugs
- [ ] Creating account doesn't refresh page
- [ ] Sometimes drawn objects disappear on save (look at console warnings when it happens)
- [ ] Changing opacity in color picker doesn't work
- [ ] Resizing MyBoards page replays animation
- [ ] Can't click in top left "dead area" of canvas menu
- [ ] Objects flicker on zoom
- [ ] Object opacity/stroke changes on zoom

#### 🔒 Dev Experience
- [ ] Move as many props in canvas types to the new context stores
- [ ] Use [zod](https://zod.dev/) for type safety
- [ ] Merge types between server and client, create shared package
- [ ] Load .env.local on app startup, save in context, crash immediately if some arguments not provided
- [ ] Review and get rid of TODO's
- [ ] Use [React Query](https://www.youtube.com/watch?v=novnyCaa7To)