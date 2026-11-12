import { test } from "node:test";
import assert from "node:assert/strict";
import { customerDesignVersion } from "../src/app/lib/designVersionSelection.ts";
test("customer keeps an older selected version when Agency recommends a newer version",()=>{
 const v1={version:1,name:"Original"},v2={version:2,name:"New"};
 assert.equal(customerDesignVersion([v2,v1],1),v1);
 assert.equal(customerDesignVersion([v1,v2],2),v2);
 assert.equal(customerDesignVersion([v2,v1],null),v2);
 assert.equal(customerDesignVersion([v2],1),v2);
 assert.equal(customerDesignVersion([],1),null);
});
