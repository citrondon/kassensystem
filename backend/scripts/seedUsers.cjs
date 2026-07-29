// seedUsers.cjs — intentionally empty
// Users are now created via the setup flow (POST /api/auth/setup)
// or manually via the settings panel (POST /api/auth/users)
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("Seed skipped — users are managed via setup flow / settings panel.");
process.exit(0);
