qconst { initAuthCreds,BufferJSON,proto } = require("baileys");
const db = require("../db/db");

async function readCreds(email) {
try{
	const results = await db.query(
		"SELECT sessions.creds FROM sessions JOIN users ON users.id = sessions.user_id WHERE users.email = $1",
		[email]
	)

	if (!results.length) {
		console.log("User not found or has no session creds.");
		return null;
	}

	return JSON.parse(results[0].creds,BufferJSON.reviver);
	} catch(error){
		console.error("Sql Error: ",error);
	}
}

async function writeCreds(email, creds) {
  if (!creds) return;
  try {
    const results = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    const userID = results[0];
    
    await db.query(
      "INSERT INTO sessions (user_id, creds) VALUES ($1, $2) ON CONFLICT(user_id) DO UPDATE SET creds = EXCLUDED.creds",
      [userID.id, JSON.stringify(creds,BufferJSON.replacer)]
    );
  } catch (error) {
    console.error("Failed to write creds:", error);
  }
}

async function readKeys(type, ids, email) {
  const results = await db.query(
    "SELECT users.id AS user_id, sessions.id AS session_id FROM users JOIN sessions ON users.id = sessions.user_id WHERE users.email = $1",
    [email]
  );

  const data = {};

  await Promise.all(ids.map(async (id) => {
    const keyValues = await db.query(
      "SELECT value FROM keys WHERE session_id = $1 AND user_id = $2 AND category = $3 AND key_id = $4",
      [results[0].session_id, results[0].user_id, type, id]
    );

    if (keyValues.length === 0) return; // no key found for this id

    let value = keyValues[0]?.value;

    if (value) {
      value = JSON.parse(value, BufferJSON.reviver);
    }

    if (type === "app-state-sync-key" && value) {
      value = proto.Message.AppStateSyncKeyData.fromObject(value);
    }

    data[id] = value;
  }));

  return data;
}

async function writeKeys(data, email) {
  // 1. Fetch user & session IDs
  const results = await db.query(
    "SELECT users.id AS user_id, sessions.id AS session_id FROM users JOIN sessions ON users.id = sessions.user_id WHERE users.email = $1",
    [email]
  );

  if (results.length === 0) return;
const userId = results[0].user_id;
const sessionId = results[0].session_id;
  // 2. Loop through categories and IDs inside
  for (const category in data) {
    for (const key_id in data[category]) {
      const value = data[category][key_id];
      if(value){
      await db.query(
        `INSERT INTO keys (session_id, user_id, category, key_id, value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id, category, key_id)
         DO UPDATE SET value = EXCLUDED.value`,
        [
          sessionId,
          userId,
          category,
          key_id,
          JSON.stringify(value, BufferJSON.replacer),
        ]
      );
    	} else{
    		await db.query(
    		          "DELETE FROM keys WHERE session_id = $1 AND user_id = $2 AND category = $3 AND key_id = $4",
    		          [sessionId, userId, category, id]
    		        );
    	}
    }
  }
}



async function useSQLAuthState(email) {
	if(!email) return;
	const checkUser = await db.query("SELECT * FROM users WHERE email = $1",[email]);
	if(checkUser.length === 0) throw new Error("User Not Found Please check your email");
  const creds = (await readCreds(email)) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          return await readKeys(type,ids,email);
        },
        set: async (data) => {
         return await writeKeys(data,email)
        }
      }
    },
    saveCreds: async () => {
      await writeCreds(email, creds)
    }
  }
}
module.exports = { useSQLAuthState }
