// Service OpenAI (compatible Google AI Studio / Groq / OpenAI)
// Toutes les clés viennent du .env — jamais en dur dans le code

const https = require('https');
const http = require('http');

/**
 * Construit l'URL complète proprement (évite les doubles slashes)
 */
function buildUrl(baseUrl, endpoint) {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}${endpoint}`;
}

/**
 * Appelle l'API IA (POST générique)
 */
function callAI(messages, maxTokens) {
  maxTokens = maxTokens || 300;
  return new Promise(function(resolve, reject) {
    var apiKey  = process.env.OPENAI_API_KEY;
    var baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    var model   = process.env.OPENAI_MODEL    || 'gpt-4o-mini';

    if (!apiKey) {
      return reject(new Error('OPENAI_API_KEY manquant dans le fichier .env'));
    }

    var fullUrl = buildUrl(baseUrl, '/chat/completions');
    var url     = new URL(fullUrl);
    var lib     = url.protocol === 'https:' ? https : http;

    var payload = JSON.stringify({ model: model, max_tokens: maxTokens, messages: messages });

    var options = {
      hostname : url.hostname,
      port     : url.port || (url.protocol === 'https:' ? 443 : 80),
      path     : url.pathname + (url.search || ''),
      method   : 'POST',
      headers  : {
        'Content-Type'  : 'application/json',
        'Authorization' : 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    var req = lib.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        console.log('[OpenAI] status=' + res.statusCode + ' url=' + url.hostname + url.pathname);

        if (data.trimStart().startsWith('<')) {
          return reject(new Error('Réponse HTML reçue — vérifiez OPENAI_BASE_URL dans .env'));
        }

        var json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          console.error('[OpenAI] Raw response:', data.substring(0, 200));
          return reject(new Error('Réponse IA non parseable: ' + data.substring(0, 80)));
        }

        if (json.error) {
          return reject(new Error(json.error.message || JSON.stringify(json.error)));
        }

        var text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        if (!text || !text.trim()) {
          console.error('[OpenAI] Réponse complète:', JSON.stringify(json).substring(0, 300));
          return reject(new Error('Réponse IA vide ou format inattendu'));
        }

        resolve(text.trim());
      });
    });

    req.on('error', function(e) { reject(new Error('Erreur réseau: ' + e.message)); });
    req.setTimeout(30000, function() {
      req.destroy();
      reject(new Error('Timeout — service IA indisponible'));
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Génère un résumé de livre via l'IA
 */
function generateSummary(title, firstName, lastName, year) {
  return callAI([
    {
      role: 'system',
      content: 'Tu es un expert en littérature. Tu génères des résumés concis et accrocheurs pour des fiches de bibliothèque. Réponds toujours en français. Maximum 3 phrases.',
    },
    {
      role: 'user',
      content: 'Génère un résumé pour le livre intitulé "' + title + '" écrit par ' + firstName + ' ' + lastName + ', publié en ' + year + '.',
    },
  ], 300);
}

/**
 * Extrait des mots-clés depuis une requête en langage naturel
 */
function extractKeywords(query) {
  return callAI([
    {
      role: 'system',
      content: 'Tu es un assistant de recherche. Extrait 3 à 5 mots-clés pertinents de la requête utilisateur. Réponds UNIQUEMENT avec un tableau JSON de mots-clés, sans texte autour, sans backticks. Exemple: ["programmation","Java","bonnes pratiques"]',
    },
    {
      role: 'user',
      content: query,
    },
  ], 100).then(function(raw) {
    var cleaned = raw.replace(/```json|```/g, '').trim();
    var keywords;
    try {
      keywords = JSON.parse(cleaned);
    } catch (e) {
      throw new Error('Format mots-clés invalide: ' + cleaned.substring(0, 80));
    }
    if (!Array.isArray(keywords)) {
      throw new Error('Les mots-clés ne sont pas un tableau');
    }
    return keywords;
  });
}

module.exports = { generateSummary, extractKeywords };