import { strict as assert } from "node:assert";
import { notificationFor } from "../src/healthtech_service";
assert.deepEqual(notificationFor("confirmed"), { send: true, message: "Appointment confirmed. Bring your medication list." });
assert.equal(notificationFor("needs_review").send, false);
console.log("notification policy: passed");
