// describe("Environment variables", () => {
//     const required: Record<string, (val: string) => boolean> = {
//         PORT:         val => /^\d+$/.test(val),
//         DATABASE_URL: val => val.startsWith("postgresql://"),
//         JWT_SECRET:   val => val.length >= 32,
//         NODE_ENV:     val => ["development", "production", "test"].includes(val),
//     };

//     for (const [key, validate] of Object.entries(required)) {
//         it(`${key} is present and valid`, () => {
//             const val = process.env[key];
//             expect(val).toBeDefined();
//             expect(validate(val!)).toBe(true);
//         });
//     }
// });
