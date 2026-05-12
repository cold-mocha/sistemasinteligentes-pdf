pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const STOPWORDS = new Set([
  // Español
  'de','la','el','en','y','a','los','del','se','las','un','por','con','una','su',
  'para','es','al','lo','como','más','o','pero','sus','le','ya','fue','ha','si',
  'porque','esta','entre','cuando','muy','sin','sobre','también','me','hasta','hay',
  'donde','quien','desde','todo','nos','durante','todos','uno','les','ni','contra',
  'otros','ese','eso','ante','ellos','e','esto','antes','algunos','qué','unos','yo',
  'otro','otras','son','eres','era','estar','tiene','ser','no','te','tu','que','él',
  'ella','nuestra','nuestro','mi','mis','tus','así','bien','sólo','solo','puede',
  'han','sido','está','están','era','eran','esa','esas','esos','cual','cuál',
  'cada','ser','le','les','dicho','tras','según','menos','vez','parte',
  // Inglés
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','been','be','have','has','had','do','does',
  'did','will','would','could','should','may','might','must','shall','can','it',
  'its','this','that','these','those','i','you','he','she','we','they','me','him',
  'her','us','them','my','your','his','our','their','what','which','who','when',
  'where','why','how','all','both','each','few','more','most','other','some','such',
  'than','then','so','yet','not','no','nor','only','same','too','very','just',
  'about','after','before','between','into','through','during','above','below',
  'out','up','down','if','while','also','however','therefore','thus','although'
]);

async function extractText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(x => x.str).join(' ') + ' ';
  }
  return text;
}

function countWords(text) {
  const freq = {};
  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúüñàèìòùâêîôûäëïöü\s]/gi, ' ')
    .split(/\s+/);
  for (const w of words) {
    if (w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return freq;
}

function topN(freq, n) {
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function fillTable(tbodyId, entries) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = entries
    .map(([w, c], i) => `<tr><td>${i+1}</td><td>${w}</td><td>${c}</td></tr>`)
    .join('');
}

function shortName(file) {
  return file.name.replace(/\.pdf$/i, '');
}

async function analyze() {
  const f1 = document.getElementById('pdf1').files[0];
  const f2 = document.getElementById('pdf2').files[0];

  if (!f1 || !f2) {
    alert('Selecciona los dos PDFs antes de continuar.');
    return;
  }

  document.getElementById('results').style.display = 'none';
  document.getElementById('loading').style.display = 'block';

  try {
    const [text1, text2] = await Promise.all([extractText(f1), extractText(f2)]);
    const freq1 = countWords(text1);
    const freq2 = countWords(text2);

    // Top 20
    fillTable('tbody1', topN(freq1, 20));
    fillTable('tbody2', topN(freq2, 20));
    document.getElementById('title1').textContent = `Top 20 palabras — ${shortName(f1)}`;
    document.getElementById('title2').textContent = `Top 20 palabras — ${shortName(f2)}`;

    // Coincidentes
    const set1 = new Set(Object.keys(freq1));
    const set2 = new Set(Object.keys(freq2));
    const common = [...set1].filter(w => set2.has(w));

    const top10common = common
      .map(w => [w, freq1[w], freq2[w]])
      .sort((a, b) => (b[1] + b[2]) - (a[1] + a[2]))
      .slice(0, 10);

    document.getElementById('tbody-common').innerHTML = top10common
      .map(([w, c1, c2], i) =>
        `<tr><td>${i+1}</td><td>${w}</td><td>${c1}</td><td>${c2}</td></tr>`)
      .join('');

    // Venn: top 5 únicas y top 5 comunes
    const commonSet = new Set(common);
    const unique1 = Object.entries(freq1)
      .filter(([w]) => !commonSet.has(w))
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
    const unique2 = Object.entries(freq2)
      .filter(([w]) => !commonSet.has(w))
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
    const mid5 = top10common.slice(0, 5).map(([w]) => w);

    document.getElementById('v-title1').textContent = shortName(f1);
    document.getElementById('v-title2').textContent = shortName(f2);
    document.getElementById('v-words1').innerHTML  = unique1.map(w => `<span>${w}</span>`).join('');
    document.getElementById('v-words2').innerHTML  = unique2.map(w => `<span>${w}</span>`).join('');
    document.getElementById('v-words-mid').innerHTML = mid5.map(w => `<span>${w}</span>`).join('');

    // Porcentaje: palabras en común / total únicas combinadas
    const totalUnique = new Set([...set1, ...set2]).size;
    const pct = totalUnique ? ((common.length / totalUnique) * 100).toFixed(1) : 0;
    document.getElementById('pct-number').textContent = pct + '%';

    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    alert('Error al procesar los PDFs: ' + err.message);
  }
}
