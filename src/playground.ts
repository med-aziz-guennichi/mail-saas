import { db } from "./server/db";

// await db.user.create({
//     data: {
//         emailAddress: 'test@gmail.com',
//         firstName: 'Aziz',
//         lastName: 'Guennichi'
//     }
// });
await db.user.deleteMany({});
console.log("done")