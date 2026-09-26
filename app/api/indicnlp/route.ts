import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import {
  INDIC_LANGUAGES,
  CLASSIFICATION_BENCHMARKS,
  tokenizeIndicText,
  normalizeIndicText,
  computeIndicCosineSimilarity,
  findNearestIndicNeighbors
} from '@/lib/indicNlpEngine';

const execAsync = util.promisify(exec);

export async function GET(_req: NextRequest) {
  try {
    const rootDir = process.cwd();
    const indicnlpDir = path.join(rootDir, 'integrations', 'indicnlp_corpus');
    const hasRepo = fs.existsSync(indicnlpDir);

    // Git info
    let gitBranch = 'master';
    let gitCommit = '';
    if (hasRepo) {
      try {
        const { stdout: bOut } = await execAsync('git branch --show-current', { cwd: indicnlpDir, timeout: 2000 });
        gitBranch = bOut.trim() || 'master';
        const { stdout: cOut } = await execAsync('git log -1 --format="%h - %s (%cd)" --date=short', { cwd: indicnlpDir, timeout: 2000 });
        gitCommit = cOut.trim();
      } catch (_) {
        // Fallback
      }
    }

    // Scripts check
    const scriptsDir = path.join(indicnlpDir, 'scripts');
    const availableScripts: string[] = [];
    if (fs.existsSync(scriptsDir)) {
      const scanFiles = (dir: string, base: string = '') => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const rel = base ? `${base}/${item.name}` : item.name;
          if (item.isDirectory()) {
            scanFiles(path.join(dir, item.name), rel);
          } else if (item.name.endsWith('.py')) {
            availableScripts.push(rel);
          }
        }
      };
      scanFiles(scriptsDir);
    }

    // Check embeddings directory
    const embeddingsDir = path.join(indicnlpDir, 'embeddings');
    const localEmbeddings: string[] = [];
    if (fs.existsSync(embeddingsDir)) {
      const files = fs.readdirSync(embeddingsDir);
      for (const f of files) {
        if (f.endsWith('.vec') || f.endsWith('.bin') || f.endsWith('.gz')) {
          localEmbeddings.push(f);
        }
      }
    }

    // Check data directory
    const dataDir = path.join(indicnlpDir, 'data');
    const localDatasets: string[] = [];
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const f of files) {
        localDatasets.push(f);
      }
    }

    // Check Python runtime
    let hasPython = false;
    let pythonVersion = '';
    try {
      const { stdout } = await execAsync('python --version', { timeout: 2500 });
      hasPython = true;
      pythonVersion = stdout.trim();
    } catch (_) {
      try {
        const { stdout } = await execAsync('py -3 --version', { timeout: 2500 });
        hasPython = true;
        pythonVersion = stdout.trim();
      } catch (__) {
        hasPython = false;
      }
    }

    // Check requirements & packages
    let hasIndicNlpLibrary = false;
    let hasFastText = false;
    if (hasPython) {
      try {
        await execAsync('python -c "import fasttext"', { timeout: 2500 });
        hasFastText = true;
      } catch (_) {
        hasFastText = false;
      }
      try {
        await execAsync('python -c "import indicnlp"', { timeout: 2500 });
        hasIndicNlpLibrary = true;
      } catch (_) {
        hasIndicNlpLibrary = false;
      }
    }

    // Enrich languages with local presence
    const enrichedLanguages = INDIC_LANGUAGES.map(lang => {
      const vecFile = `indicnlp.v1.${lang.code}.vec`;
      const vecGz = `indicnlp.v1.${lang.code}.vec.gz`;
      const binFile = `indicnlp.v1.${lang.code}.bin`;
      const corpusFile = `${lang.code}.txt`;

      const hasLocalVec = localEmbeddings.includes(vecFile) || localEmbeddings.includes(vecGz);
      const hasLocalBin = localEmbeddings.includes(binFile);
      const hasLocalCorpus = localDatasets.includes(corpusFile);

      return {
        ...lang,
        hasLocalVec,
        hasLocalBin,
        hasLocalCorpus
      };
    });

    return NextResponse.json({
      success: true,
      hasRepo,
      indicnlpDir: hasRepo ? indicnlpDir : null,
      gitBranch,
      gitCommit,
      hasPython,
      pythonVersion,
      hasFastText,
      hasIndicNlpLibrary,
      availableScripts,
      localEmbeddings,
      localDatasets,
      languages: enrichedLanguages,
      benchmarks: CLASSIFICATION_BENCHMARKS,
      stats: {
        totalLanguages: INDIC_LANGUAGES.length,
        totalTokens: '9.0+ Billion',
        totalSentences: '370+ Million',
        totalArticles: '31+ Million'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'IndicNLP status check failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const rootDir = process.cwd();
    const indicnlpDir = path.join(rootDir, 'integrations', 'indicnlp_corpus');

    if (action === 'tokenize') {
      const { text, lang } = body;
      if (!text) {
        return NextResponse.json({ error: 'Text is required for tokenization' }, { status: 400 });
      }
      const tokenizedResult = tokenizeIndicText(text, lang);
      return NextResponse.json({
        success: true,
        ...tokenizedResult
      });
    }

    if (action === 'normalize') {
      const { text, lang } = body;
      if (!text) {
        return NextResponse.json({ error: 'Text is required for normalization' }, { status: 400 });
      }
      const normalized = normalizeIndicText(text, lang);
      return NextResponse.json({
        success: true,
        normalized
      });
    }

    if (action === 'similarity') {
      const { word1, word2 } = body;
      if (!word1 || !word2) {
        return NextResponse.json({ error: 'Both word1 and word2 are required' }, { status: 400 });
      }
      const similarity = computeIndicCosineSimilarity(word1, word2);
      const nearestToWord1 = findNearestIndicNeighbors(word1, 4);
      const nearestToWord2 = findNearestIndicNeighbors(word2, 4);

      return NextResponse.json({
        success: true,
        word1,
        word2,
        similarity,
        similarityPercent: Math.round(similarity * 100),
        nearestToWord1,
        nearestToWord2
      });
    }

    if (action === 'nearest-neighbors') {
      const { word, topK = 6 } = body;
      if (!word) {
        return NextResponse.json({ error: 'Word is required' }, { status: 400 });
      }
      const neighbors = findNearestIndicNeighbors(word, topK);
      return NextResponse.json({
        success: true,
        word,
        neighbors
      });
    }

    if (action === 'classify') {
      const { text, lang = 'hi' } = body;
      if (!text) {
        return NextResponse.json({ error: 'Text is required for classification' }, { status: 400 });
      }

      // Keyword & linguistic centroid scoring
      const normalized = text.toLowerCase();
      const categories = [
        {
          name: 'sports',
          label: 'Sports / खेल / રમતગમત / விளையாட்டு',
          keywords: ['cricket', 'football', 'match', 'match', 'ipl', 'score', 'trophy', 'stadium', 'विकेट', 'रन', 'मैच', 'क्रिकेट', 'जीत', 'हार', 'ખેલ', 'રન', 'விளையாட்டு', 'கிரிக்கெட்']
        },
        {
          name: 'business',
          label: 'Business / व्यापार / વેપાર / வணிகம்',
          keywords: ['market', 'stock', 'share', 'sensex', 'nifty', 'rupee', 'dollar', 'bank', 'economy', 'व्यापार', 'बाजार', 'शेयर', 'सेंसेक्स', 'बैंक', 'અર્થતંત્ર', 'શેરબજાર', 'வணிகம்']
        },
        {
          name: 'entertainment',
          label: 'Entertainment / मनोरंजन / સિનેમા / சினிமா',
          keywords: ['movie', 'film', 'actor', 'actress', 'song', 'cinema', 'bollywood', 'ott', 'फिल्म', 'अभिनेता', 'सिनेमा', 'गाने', 'कलाकार', 'સંગીત', 'ચલચિત્ર', 'திரைப்படம்', 'நடிகர்']
        },
        {
          name: 'politics',
          label: 'Politics / राजनीति / રાજકારણ / அரசியல்',
          keywords: ['election', 'minister', 'government', 'party', 'vote', 'parliament', 'चुनाव', 'नेता', 'सरकार', 'पार्टी', 'संसद', 'પ્રધાનમંત્રી', 'રાજકારણ', 'அரசியல்', 'தேர்தல்']
        },
        {
          name: 'technology',
          label: 'Technology / प्रौद्योगिकी / ટેકનોલોજી / தொழில்நுட்பம்',
          keywords: ['ai', 'software', 'digital', 'tech', 'computer', 'app', 'online', 'तकनीक', 'सॉफ्टवेयर', 'कंप्यूटर', 'તકનીક', 'செயற்கை நுண்ணறிவு']
        }
      ];

      const scored = categories.map(cat => {
        let score = 0.05; // base prior
        cat.keywords.forEach(kw => {
          if (normalized.includes(kw.toLowerCase())) score += 0.35;
        });
        return {
          name: cat.name,
          label: cat.label,
          score: Math.min(1.0, score)
        };
      }).sort((a, b) => b.score - a.score);

      // Normalize scores into probabilities
      const sum = scored.reduce((acc, c) => acc + c.score, 0);
      const probabilities = scored.map(c => ({
        ...c,
        confidence: Math.round((c.score / sum) * 100)
      }));

      return NextResponse.json({
        success: true,
        lang,
        topCategory: probabilities[0].name,
        confidence: probabilities[0].confidence,
        predictions: probabilities
      });
    }

    if (action === 'create-folders') {
      const dirsToCreate = [
        path.join(indicnlpDir, 'embeddings'),
        path.join(indicnlpDir, 'data'),
        path.join(indicnlpDir, 'morfessor')
      ];
      for (const d of dirsToCreate) {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
      }
      return NextResponse.json({
        success: true,
        message: 'IndicNLP asset directories ready'
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
