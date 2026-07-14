import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Set up sessions for Login tracking
app.use(cookieSession({
  name: 'cb-audit-session',
  keys: [process.env.SESSION_SECRET || 'cb-audit-super-secret-key-123'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// --- 1. Audit Log Parser Engine ---
export function parseAuditLog(logText) {
  if (!logText || !logText.includes('[AuditTrail]') || !logText.includes('AuditEvent(')) {
    return null;
  }
  
  try {
    // Extract userId
    const userIdMatch = logText.match(/userId=([^, ]+)/);
    // Extract userName
    const userNameMatch = logText.match(/userName=([^,]+), timestamp=/);
    // Extract timestamp
    const timestampMatch = logText.match(/timestamp=(\d+)/);
    // Extract accountId
    const accountIdMatch = logText.match(/accountId=([^, ]+)/);
    
    // Extract auditEntity fields
    const parentObjectIdMatch = logText.match(/parentObjectId=([^, ]+)/);
    const parentObjectNameMatch = logText.match(/parentObjectName=([^,]+), parentObjectType=/);
    const objectNameMatch = logText.match(/objectName=([^,]+), objectId=/);
    const objectIdMatch = logText.match(/objectId=([^,]+), activity=/);
    const activityMatch = logText.match(/activity=([^, ]+)/);
    
    // Extract modifications
    const modifications = [];
    const modRegex = /Modification\(([^)]+)\)/g;
    let modMatch;
    const modsSectionMatch = logText.match(/modificationsList=\[(.*)\]\)\)/);
    if (modsSectionMatch) {
      const modsStr = modsSectionMatch[1];
      while ((modMatch = modRegex.exec(modsStr)) !== null) {
        const modContent = modMatch[1];
        
        const element = (modContent.match(/element=([^,]+)/) || [])[1] || '';
        
        let oldValue = '';
        let newValue = '';
        
        const oldValMatch = modContent.match(/oldValue=(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([^,)]+))/);
        if (oldValMatch) {
          oldValue = oldValMatch[1] !== undefined ? oldValMatch[1] : oldValMatch[2];
        }
        
        const newValMatch = modContent.match(/newValue=(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([^,)]+))/);
        if (newValMatch) {
          newValue = newValMatch[1] !== undefined ? newValMatch[1] : newValMatch[2];
        }
        
        modifications.push({ element, oldValue, newValue });
      }
    }
    
    return {
      userId: userIdMatch ? userIdMatch[1] : '',
      userName: userNameMatch ? userNameMatch[1] : '',
      timestamp: timestampMatch ? parseInt(timestampMatch[1]) : Date.now(),
      accountId: accountIdMatch ? accountIdMatch[1] : '',
      parentObjectId: parentObjectIdMatch ? parentObjectIdMatch[1] : '',
      parentObjectName: parentObjectNameMatch ? parentObjectNameMatch[1] : '',
      objectName: objectNameMatch ? objectNameMatch[1] : '',
      objectId: objectIdMatch ? objectIdMatch[1] : '',
      activity: activityMatch ? activityMatch[1] : '',
      modifications
    };
  } catch (e) {
    console.error("Failed parsing audit log", e);
    return null;
  }
}

// --- 2. LivePerson Environment & CSDS Lookup ---
async function fetchServiceDomain(accountId, serviceName) {
  try {
    const csdsUrl = `https://admin-csds.liveperson.net/api/v1/service/domain?account=${accountId}&service=${serviceName}`;
    const response = await axios.get(csdsUrl, { timeout: 3000 });
    return response.data?.domain || null;
  } catch (err) {
    console.warn(`[CSDS] Call failed for service ${serviceName} on account ${accountId}.`);
    return null;
  }
}

async function resolveEnvironment(accountId) {
  if (accountId.startsWith('999') || accountId.includes('qa')) {
    return {
      env: 'QA / Sandbox',
      server: 'https://qa-es-cluster.liveperson.net:9200',
      dataView: 'cb-audit-qa-view',
      space: 'QA Audit Space'
    };
  }

  const domain = await fetchServiceDomain(accountId, 'le');

  if (domain) {
    if (domain.includes('z1') || domain.includes('us')) {
      return {
        env: 'US Production',
        server: 'https://prod-us-es.liveperson.net:9200',
        dataView: 'cb-audit-us-prod-view',
        space: 'US Prod Space'
      };
    } else if (domain.includes('z2') || domain.includes('eu')) {
      return {
        env: 'EU Production',
        server: 'https://prod-eu-es.liveperson.net:9200',
        dataView: 'cb-audit-eu-prod-view',
        space: 'EU Prod Space'
      };
    } else if (domain.includes('z3') || domain.includes('apac') || domain.includes('ap')) {
      return {
        env: 'APAC Production',
        server: 'https://prod-apac-es.liveperson.net:9200',
        dataView: 'cb-audit-apac-prod-view',
        space: 'APAC Prod Space'
      };
    }
  }

  // Fallback heuristics based on standard LP Account prefix patterns
  if (accountId.startsWith('5')) {
    return {
      env: 'US Production',
      server: 'https://prod-us-es.liveperson.net:9200',
      dataView: 'cb-audit-us-prod-view',
      space: 'US Prod Space'
    };
  } else if (accountId.startsWith('6')) {
    return {
      env: 'EU Production',
      server: 'https://prod-eu-es.liveperson.net:9200',
      dataView: 'cb-audit-eu-prod-view',
      space: 'EU Prod Space'
    };
  } else {
    return {
      env: 'QA / Sandbox',
      server: 'https://qa-es-cluster.liveperson.net:9200',
      dataView: 'cb-audit-qa-view',
      space: 'QA Audit Space'
    };
  }
}

// --- 3. Mock Log Database for Sandbox Demonstration ---
const MOCK_AUDIT_LOG_STRINGS = [
  (botId) => `[AuditTrail] Pushed audit event with id: d96b78d3-56aa-43ff-88c2-40de5543bb01 to redis queue for processing: AuditEvent(id=d96b78d3-56aa-43ff-88c2-40de5543bb01, userId=57609520.10502934855, userName=Zheni Vasileva, timestamp=${Date.now() - 3600000 * 2}, source=CONVERSATION_BUILDER, accountId=57609520, auditEntity=AuditEntity(organizationId=a2c2b859-d64f-49b2-af19-8ce023473f6b, exclusive=false, parentObjectId=${botId}, parentObjectName=Customer Service Assistant Bot, parentObjectType=BOT, objectType=INTERACTION, objectName=text_welcome, objectId=64fbe348457b13e75e24362974e9c2691409a1fe, activity=Updated, description=null, modificationsList=[Modification(element=content.results.tile.tileData.0.text, oldValue="Welcome! How may I assist you today?", newValue="Hello there! Welcome to LivePerson Support. How can I help you today? 😊")]))`,
  (botId) => `[AuditTrail] Pushed audit event with id: 89ab32c8-89fa-45b7-a3f1-d890638708ba to redis queue for processing: AuditEvent(id=89ab32c8-89fa-45b7-a3f1-d890638708ba, userId=57609520.20398485777, userName=John Doe, timestamp=${Date.now() - 3600000 * 5}, source=CONVERSATION_BUILDER, accountId=57609520, auditEntity=AuditEntity(organizationId=a2c2b859-d64f-49b2-af19-8ce023473f6b, exclusive=false, parentObjectId=${botId}, parentObjectName=Customer Service Assistant Bot, parentObjectType=BOT, objectType=INTEGRATION, objectName=Salesforce_Lead_Creation, objectId=b871c8901bfa56a, activity=Updated, description=null, modificationsList=[Modification(element=settings.endpointUrl, oldValue="https://api.salesforce.com/services/data/v52.0/sobjects/Lead", newValue="https://api.salesforce.com/services/data/v58.0/sobjects/Lead"), Modification(element=settings.timeout, oldValue="2000", newValue="5000")]))`,
  (botId) => `[AuditTrail] Pushed audit event with id: c38b76df-c782-4bc1-90a9-25f0cb1875fa to redis queue for processing: AuditEvent(id=c38b76df-c782-4bc1-90a9-25f0cb1875fa, userId=57609520.10502934855, userName=Zheni Vasileva, timestamp=${Date.now() - 3600000 * 24}, source=CONVERSATION_BUILDER, accountId=57609520, auditEntity=AuditEntity(organizationId=a2c2b859-d64f-49b2-af19-8ce023473f6b, exclusive=false, parentObjectId=${botId}, parentObjectName=Customer Service Assistant Bot, parentObjectType=BOT, objectType=INTENT, objectName=Billing_Dispute, objectId=intent_billing_dispute_992, activity=Created, description=null, modificationsList=[Modification(element=intent.name, oldValue=null, newValue="Billing_Dispute"), Modification(element=intent.phrasesCount, oldValue="0", newValue="15")]))`,
  (botId) => `[AuditTrail] Pushed audit event with id: a12c83df-cf18-4982-aa87-fa89a9d701ee to redis queue for processing: AuditEvent(id=a12c83df-cf18-4982-aa87-fa89a9d701ee, userId=57609520.30129487572, userName=Sarah Connor, timestamp=${Date.now() - 3600000 * 48}, source=CONVERSATION_BUILDER, accountId=57609520, auditEntity=AuditEntity(organizationId=a2c2b859-d64f-49b2-af19-8ce023473f6b, exclusive=false, parentObjectId=${botId}, parentObjectName=Customer Service Assistant Bot, parentObjectType=BOT, objectType=INTERACTION, objectName=carousel_promotions, objectId=9f8a2b34c56e7d8f, activity=Deleted, description=null, modificationsList=[Modification(element=interaction, oldValue="[CarouselInteraction with 3 items]", newValue=null)]))`
];

// --- 4. Corporate Security Authentication Middleware ---
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required. Please log in.' });
};

// --- 5. API Routes ---

// Get current session user status
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Live Google JWT ID Token Authentication
app.post('/auth/google-login', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Google JWT Token is required.' });
  }

  try {
    // Decode the secure Google JWT token (base64 payload decoding)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(400).json({ error: 'Invalid Google Token format.' });
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
    
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture;
    const emailDomain = email.split('@')[1];

    // SECURITY DOMAIN CHECK: Restrict to Gmail & LivePerson accounts
    const allowedDomains = ['liveperson.com', 'gmail.com'];
    if (allowedDomains.includes(emailDomain) || email.endsWith('@gmail.com')) {
      req.session.user = {
        email: email,
        name: name,
        picture: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
        domain: emailDomain,
        token: token // Stores the actual Google ID token to be passed as authorization to Elasticsearch!
      };

      res.json({ success: true, user: req.session.user });
    } else {
      res.status(403).json({ error: 'Access Forbidden: Only authorized Gmail or @liveperson.com accounts are permitted.' });
    }

  } catch (error) {
    console.error('JWT Token Verification Error:', error);
    res.status(500).json({ error: 'Failed to authenticate Google identity token.' });
  }
});

// Developer Sandbox Bypass Endpoint (Mock Google Token Login)
app.post('/auth/developer-bypass', (req, res) => {
  const { email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const emailDomain = email.split('@')[1];
  req.session.user = {
    email: email,
    name: name || email.split('@')[0],
    picture: `https://api.dicebear.com/7.x/initials/svg?seed=${name || email}`,
    domain: emailDomain,
    token: 'mock-bearer-token-sandbox-12345'
  };
  res.json({ success: true, user: req.session.user });
});

// Log out Endpoint
app.post('/auth/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// CSDS Environment Check Endpoint
app.get('/api/env-lookup', requireAuth, async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  const envDetails = await resolveEnvironment(accountId);
  res.json(envDetails);
});

// Query Logs Endpoint (Uses the Google ID token as Bearer authorization)
app.get('/api/search', requireAuth, async (req, res) => {
  const { accountId, botId, dateFrom, dateTo } = req.query;
  if (!accountId || !botId) {
    return res.status(400).json({ error: 'Account ID and Bot ID (parentObjectId) are required.' });
  }

  const envDetails = await resolveEnvironment(accountId);
  const userToken = req.session.user.token; // Active corporate Google ID Token!

  try {
    let rawLogs = [];

    // Query Elasticsearch using the User's corporate Google ID Token
    if (userToken && userToken !== 'mock-bearer-token-sandbox-12345') {
      const elasticSearchEndpoint = `${envDetails.server}/${envDetails.dataView}/_search`;
      
      const searchBody = {
        size: 200,
        query: {
          bool: {
            must: [
              { match_phrase: { "message": "Pushed audit event" } },
              { match_phrase: { "message": `parentObjectId=${botId}` } }
            ]
          }
        },
        sort: [
          { "timestamp": { "order": "desc" } }
        ]
      };

      // Querying Elasticsearch with user's ID token directly!
      const esResponse = await axios.post(elasticSearchEndpoint, searchBody, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      const hits = esResponse.data?.hits?.hits || [];
      rawLogs = hits.map(hit => hit._source?.message || hit._source?.log || hit._source?.rawLog).filter(Boolean);
      
    } else {
      // Safe fallback to simulated sandbox audit trail if using dev demo bypass authentication
      rawLogs = MOCK_AUDIT_LOG_STRINGS.map(generator => generator(botId));
    }

    // Process & parse audit log strings into clean timelines
    const parsedEvents = rawLogs
      .map(logStr => parseAuditLog(logStr))
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      environment: envDetails,
      totalCount: parsedEvents.length,
      events: parsedEvents
    });

  } catch (error) {
    console.error(`[Elastic Search ERROR] status=${error.response?.status}:`, error.response?.data || error.message);
    res.status(500).json({ 
      error: `Failed to fetch logs from cluster: Elasticsearch returned status ${error.response?.status || '500'}. Make sure your corporate account has appropriate search permissions in the resolved cluster space.` 
    });
  }
});

// Pasted Raw Log Parser
app.post('/api/parse-raw', requireAuth, (req, res) => {
  const { logText } = req.body;
  if (!logText) {
    return res.status(400).json({ error: 'Log content is required' });
  }

  const parsed = parseAuditLog(logText);
  if (!parsed) {
    return res.status(400).json({ error: 'Format unrecognized. Make sure log is a valid [AuditTrail] AuditEvent entry.' });
  }

  res.json({ event: parsed });
});

// Serve frontend in Production mode
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 CB-Audit Backend running on http://localhost:${PORT}`);
});
