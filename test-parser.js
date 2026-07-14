import { parseAuditLog } from './server.js';

const sampleLog = `[AuditTrail] Pushed audit event with id: 248d90b2-83be-4691-b335-cc0ed86faa45 to redis queue for processing: AuditEvent(id=248d90b2-83be-4691-b335-cc0ed86faa45, userId=57609520.10502934855, userName=Zheni Vasileva, timestamp=1784054451434, source=CONVERSATION_BUILDER, accountId=57609520, auditEntity=AuditEntity(organizationId=a2c2b859-d64f-49b2-af19-8ce023473f6b, exclusive=false, parentObjectId=c72f03b7-cbb7-47ec-af31-cb7e16d7af56, parentObjectName=Generative AI messaging bot template (2026-07-10-21-20-57), parentObjectType=BOT, objectType=INTERACTION, objectName=text_6, objectId=64fbe348457b13e75e24362974e9c2691409a1fe, activity=Updated, description=null, modificationsList=[Modification(element=content.results.tile.tileData.0.text, oldValue="hello there!", newValue="hello there! how may I assist?")]))`;

console.log("Starting Audit Log Parser Verification...");

const result = parseAuditLog(sampleLog);

if (result) {
  console.log("\n✅ SUCCESS: Parse succeeded!");
  console.log(JSON.stringify(result, null, 2));
  
  // Assertions
  const assertions = [
    { name: "userId", ok: result.userId === "57609520.10502934855" },
    { name: "userName", ok: result.userName === "Zheni Vasileva" },
    { name: "timestamp", ok: result.timestamp === 1784054451434 },
    { name: "accountId", ok: result.accountId === "57609520" },
    { name: "parentObjectId", ok: result.parentObjectId === "c72f03b7-cbb7-47ec-af31-cb7e16d7af56" },
    { name: "parentObjectName", ok: result.parentObjectName === "Generative AI messaging bot template (2026-07-10-21-20-57)" },
    { name: "objectName", ok: result.objectName === "text_6" },
    { name: "objectId", ok: result.objectId === "64fbe348457b13e75e24362974e9c2691409a1fe" },
    { name: "activity", ok: result.activity === "Updated" },
    { name: "modifications length", ok: result.modifications.length === 1 },
    { name: "modification element", ok: result.modifications[0].element === "content.results.tile.tileData.0.text" },
    { name: "modification oldValue", ok: result.modifications[0].oldValue === "hello there!" },
    { name: "modification newValue", ok: result.modifications[0].newValue === "hello there! how may I assist?" }
  ];
  
  let failed = false;
  console.log("\n🔍 Running Assertions:");
  assertions.forEach(as => {
    if (as.ok) {
      console.log(`  [OK] ${as.name}`);
    } else {
      console.log(`  [FAIL] ${as.name}`);
      failed = true;
    }
  });
  
  if (failed) {
    console.log("\n❌ Assertions failed!");
    process.exit(1);
  } else {
    console.log("\n🎉 All assertions passed successfully!");
    process.exit(0);
  }
} else {
  console.log("\n❌ ERROR: Parse failed entirely!");
  process.exit(1);
}
