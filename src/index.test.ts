import "mocha";
import { expect } from "chai";
import * as supertest from "supertest";
import { createApp } from "./index";
import * as fs from "fs";

class TemporaryDirectoryManager {
  private directories: string[] = [];

  constructor(private prefix = ".test-") {}

  create(): string {
    const result = fs.mkdtempSync(this.prefix);
    this.directories.push(result);
    return result;
  }

  cleanup() {
    for (const directory of this.directories) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
}

const TEST_PORT = 44513;

describe("app", () => {
  const manager = new TemporaryDirectoryManager();
  after(() => manager.cleanup());

  it("case1", async () => {
    const directory = manager.create();
    const app = createApp({ cache_directory: directory });
    const testApp = await supertest(app.listen(TEST_PORT));
    {
      const res = await testApp.get("/get");
      expect(res.statusCode).equal(200);
      expect(res.headers["x-cache-proxy"]).equal("miss");
    }
    {
      const res = await testApp.get("/get");
      expect(res.statusCode).equal(200);
      expect(res.headers["x-cache-proxy"]).equal("hit");
    }
  });
});
