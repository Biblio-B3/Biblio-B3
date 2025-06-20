import { beforeAll, afterAll } from "@jest/globals";
import { pool, startDatabase } from "../app/config/database";
import { init } from "../index";

beforeAll(async () => {
    await startDatabase();
    await init();
});

afterAll(async () => {
    await pool.end();
});