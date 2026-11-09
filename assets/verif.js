/* verif.js — verificacion.html. Lee el resumen que genera scripts/verif/verif_summary.py
   (servido por /v1/verif/summary y /v1/verif/series/:estación) y dibuja tarjetas y gráficas SVG.
   Sin dependencias. */
(function () {
  'use strict';
  var root = document.getElementById('vf-app');
  if (!root) return;
  var API = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(location.origin) ? location.origin : 'https://thredds.b1tmet.com';
  var NS = 'http://www.w3.org/2000/svg';

  // ------------------------------------------------------------ textos
  var T = {
    es: {
      loading: 'Cargando datos…', err: 'No se pudieron cargar los datos de verificación.',
      group: 'Grupo', win: 'Ventana', lead: 'Plazo', sample: 'Muestra', common: 'Común', own: 'Propia',
      d30: '30 días', d90: '90 días', dall: 'Todo',
      v: { t2: 'Temperatura', rh: 'Humedad', slp: 'Presión', ws: 'Viento', wd: 'Dirección' },
      vl: { t2: 'Temperatura a 2 m', rh: 'Humedad relativa', slp: 'Presión a nivel del mar', ws: 'Velocidad del viento a 10 m', wd: 'Dirección del viento' },
      tilesHelp: 'El número grande de cada tarjeta es el error medio absoluto (MAE): cuánto se equivoca el modelo de media, sin importar el signo. Cuanto menor, mejor. El sesgo indica hacia dónde: positivo si pronostica de más, negativo si de menos.',
      mae: 'MAE', bias: 'sesgo', rmse: 'RMSE', pairs: 'pares', stations: 'estaciones', days: 'días',
      min: 'mín.', accH: 'Acumulando datos', accP: 'Archivo desde el {d}. Cada combinación de grupo, variable y plazo se publica cuando WRF reúne en la muestra común los mínimos de abajo; hasta entonces las cifras son provisionales. Contadores de: {c}.',
      readyH: 'Datos suficientes para esta selección', readyP: 'Esta combinación de grupo, ventana, variable y plazo supera los umbrales de publicación. Contadores de: {c}.',
      ownWarn: 'Muestra propia: cada modelo con todos sus pares, en estaciones y horas distintas. Sirve para ver cifras, no para comparar modelos.',
      commonEmpty: 'Aún no hay muestra común en este grupo y ventana: los modelos todavía no comparten horas de inicio. Prueba la muestra propia.',
      barsT: 'Error medio absoluto por modelo', barsS: 'Barra: MAE · línea: intervalo del 95 %',
      leadT: 'Error según el plazo', leadS: 'MAE por hora de pronóstico, toda la ventana disponible',
      ref: 'Referencia', vRefBetter: 'WRF mejor', vRefWorse: 'WRF peor', vTie: 'Sin diferencia clara',
      stT: 'Pronóstico y observación por estación', stS: 'Últimos 14 días y pronóstico en curso · plazo {l} h',
      station: 'Estación', obs: 'Observación', now: 'ahora', noData: 'Sin datos para esta variable.',
      noElev: 'sin corregir por altura', buoys: 'Boyas', buoy: 'boya', allSt: 'Todas las estaciones',
      grid: 'estaciones en la malla de {k} km', h: 'h', updated: 'Actualizado {d}', ciFew: 'Intervalos ocultos: menos de 7 días de datos.',
      free: 'plan Free', pro: 'malla más fina', obsN: '{n} obs.'
    },
    en: {
      loading: 'Loading data…', err: 'Could not load the verification data.',
      group: 'Group', win: 'Window', lead: 'Lead time', sample: 'Sample', common: 'Common', own: 'Own',
      d30: '30 days', d90: '90 days', dall: 'All',
      v: { t2: 'Temperature', rh: 'Humidity', slp: 'Pressure', ws: 'Wind', wd: 'Direction' },
      vl: { t2: '2 m temperature', rh: 'Relative humidity', slp: 'Sea-level pressure', ws: '10 m wind speed', wd: 'Wind direction' },
      tilesHelp: 'The large number on each card is the mean absolute error (MAE): how far off the model is on average, regardless of sign. Lower is better. Bias shows the direction: positive if it forecasts too high, negative if too low.',
      mae: 'MAE', bias: 'bias', rmse: 'RMSE', pairs: 'pairs', stations: 'stations', days: 'days',
      min: 'min.', accH: 'Collecting data', accP: 'Archive running since {d}. Each combination of group, variable and lead time is published once WRF reaches the minimums below in the common sample; until then the figures are provisional. Counters for: {c}.',
      readyH: 'Enough data for this selection', readyP: 'This combination of group, window, variable and lead time meets the publication thresholds. Counters for: {c}.',
      ownWarn: 'Own sample: each model with all its pairs, at different stations and times. Good for seeing figures, not for comparing models.',
      commonEmpty: 'No common sample yet in this group and window: the models do not share initial times yet. Try the own sample.',
      barsT: 'Mean absolute error by model', barsS: 'Bar: MAE · line: 95% interval',
      leadT: 'Error by lead time', leadS: 'MAE by forecast hour, whole available window',
      ref: 'Reference', vRefBetter: 'WRF better', vRefWorse: 'WRF worse', vTie: 'No clear difference',
      stT: 'Forecast and observation by station', stS: 'Last 14 days and current forecast · lead {l} h',
      station: 'Station', obs: 'Observation', now: 'now', noData: 'No data for this variable.',
      noElev: 'not height-corrected', buoys: 'Buoys', buoy: 'buoy', allSt: 'All stations',
      grid: 'stations in the {k} km grid', h: 'h', updated: 'Updated {d}', ciFew: 'Intervals hidden: fewer than 7 days of data.',
      free: 'Free plan', pro: 'finest grid', obsN: '{n} obs.'
    },
    pt: {
      loading: 'Carregando dados…', err: 'Não foi possível carregar os dados de verificação.',
      group: 'Grupo', win: 'Janela', lead: 'Prazo', sample: 'Amostra', common: 'Comum', own: 'Própria',
      d30: '30 dias', d90: '90 dias', dall: 'Tudo',
      v: { t2: 'Temperatura', rh: 'Umidade', slp: 'Pressão', ws: 'Vento', wd: 'Direção' },
      vl: { t2: 'Temperatura a 2 m', rh: 'Umidade relativa', slp: 'Pressão ao nível do mar', ws: 'Velocidade do vento a 10 m', wd: 'Direção do vento' },
      tilesHelp: 'O número grande de cada cartão é o erro médio absoluto (MAE): quanto o modelo erra em média, sem importar o sinal. Quanto menor, melhor. O viés indica a direção: positivo se prevê a mais, negativo se a menos.',
      mae: 'MAE', bias: 'viés', rmse: 'RMSE', pairs: 'pares', stations: 'estações', days: 'dias',
      min: 'mín.', accH: 'Acumulando dados', accP: 'Arquivo desde {d}. Cada combinação de grupo, variável e prazo é publicada quando o WRF reúne na amostra comum os mínimos abaixo; até lá os números são provisórios. Contadores de: {c}.',
      readyH: 'Dados suficientes para esta seleção', readyP: 'Esta combinação de grupo, janela, variável e prazo supera os limiares de publicação. Contadores de: {c}.',
      ownWarn: 'Amostra própria: cada modelo com todos os seus pares, em estações e horas diferentes. Serve para ver números, não para comparar modelos.',
      commonEmpty: 'Ainda não há amostra comum neste grupo e janela: os modelos ainda não compartilham horas de início. Experimente a amostra própria.',
      barsT: 'Erro médio absoluto por modelo', barsS: 'Barra: MAE · linha: intervalo de 95 %',
      leadT: 'Erro segundo o prazo', leadS: 'MAE por hora de previsão, toda a janela disponível',
      ref: 'Referência', vRefBetter: 'WRF melhor', vRefWorse: 'WRF pior', vTie: 'Sem diferença clara',
      stT: 'Previsão e observação por estação', stS: 'Últimos 14 dias e previsão em curso · prazo {l} h',
      station: 'Estação', obs: 'Observação', now: 'agora', noData: 'Sem dados para esta variável.',
      noElev: 'sem correção de altitude', buoys: 'Boias', buoy: 'boia', allSt: 'Todas as estações',
      grid: 'estações na grade de {k} km', h: 'h', updated: 'Atualizado {d}', ciFew: 'Intervalos ocultos: menos de 7 dias de dados.',
      free: 'plano Free', pro: 'grade mais fina', obsN: '{n} obs.'
    },
    fr: {
      loading: 'Chargement des données…', err: 'Impossible de charger les données de vérification.',
      group: 'Groupe', win: 'Période', lead: 'Échéance', sample: 'Échantillon', common: 'Commun', own: 'Propre',
      d30: '30 jours', d90: '90 jours', dall: 'Tout',
      v: { t2: 'Température', rh: 'Humidité', slp: 'Pression', ws: 'Vent', wd: 'Direction' },
      vl: { t2: 'Température à 2 m', rh: 'Humidité relative', slp: 'Pression au niveau de la mer', ws: 'Vitesse du vent à 10 m', wd: 'Direction du vent' },
      tilesHelp: 'Le grand chiffre de chaque carte est l\'erreur absolue moyenne (MAE) : l\'écart moyen du modèle, quel que soit le signe. Plus il est bas, mieux c\'est. Le biais indique le sens : positif si le modèle prévoit trop haut, négatif si trop bas.',
      mae: 'MAE', bias: 'biais', rmse: 'RMSE', pairs: 'paires', stations: 'stations', days: 'jours',
      min: 'min.', accH: 'Collecte des données', accP: 'Archivage depuis le {d}. Chaque combinaison de groupe, variable et échéance est publiée lorsque WRF atteint dans l\'échantillon commun les minimums ci-dessous ; d\'ici là, les chiffres sont provisoires. Compteurs pour : {c}.',
      readyH: 'Données suffisantes pour cette sélection', readyP: 'Cette combinaison de groupe, période, variable et échéance dépasse les seuils de publication. Compteurs pour : {c}.',
      ownWarn: 'Échantillon propre : chaque modèle avec toutes ses paires, à des stations et heures différentes. Utile pour voir des chiffres, pas pour comparer les modèles.',
      commonEmpty: 'Pas encore d\'échantillon commun pour ce groupe et cette période : les modèles ne partagent pas encore d\'heures initiales. Essayez l\'échantillon propre.',
      barsT: 'Erreur absolue moyenne par modèle', barsS: 'Barre : MAE · trait : intervalle à 95 %',
      leadT: 'Erreur selon l\'échéance', leadS: 'MAE par heure de prévision, toute la période disponible',
      ref: 'Référence', vRefBetter: 'WRF meilleur', vRefWorse: 'WRF moins bon', vTie: 'Pas de différence nette',
      stT: 'Prévision et observation par station', stS: '14 derniers jours et prévision en cours · échéance {l} h',
      station: 'Station', obs: 'Observation', now: 'maintenant', noData: 'Pas de données pour cette variable.',
      noElev: 'sans correction d\'altitude', buoys: 'Bouées', buoy: 'bouée', allSt: 'Toutes les stations',
      grid: 'stations dans la grille de {k} km', h: 'h', updated: 'Mis à jour {d}', ciFew: 'Intervalles masqués : moins de 7 jours de données.',
      free: 'offre Free', pro: 'grille la plus fine', obsN: '{n} obs.'
    },
    it: {
      loading: 'Caricamento dei dati…', err: 'Impossibile caricare i dati di verifica.',
      group: 'Gruppo', win: 'Periodo', lead: 'Scadenza', sample: 'Campione', common: 'Comune', own: 'Proprio',
      d30: '30 giorni', d90: '90 giorni', dall: 'Tutto',
      v: { t2: 'Temperatura', rh: 'Umidità', slp: 'Pressione', ws: 'Vento', wd: 'Direzione' },
      vl: { t2: 'Temperatura a 2 m', rh: 'Umidità relativa', slp: 'Pressione al livello del mare', ws: 'Velocità del vento a 10 m', wd: 'Direzione del vento' },
      tilesHelp: 'Il numero grande di ogni scheda è l\'errore assoluto medio (MAE): quanto sbaglia il modello in media, a prescindere dal segno. Più è basso, meglio è. Il bias indica la direzione: positivo se prevede troppo alto, negativo se troppo basso.',
      mae: 'MAE', bias: 'bias', rmse: 'RMSE', pairs: 'coppie', stations: 'stazioni', days: 'giorni',
      min: 'min.', accH: 'Raccolta dei dati', accP: 'Archivio attivo dal {d}. Ogni combinazione di gruppo, variabile e scadenza viene pubblicata quando WRF raggiunge nel campione comune i minimi qui sotto; fino ad allora i valori sono provvisori. Contatori per: {c}.',
      readyH: 'Dati sufficienti per questa selezione', readyP: 'Questa combinazione di gruppo, periodo, variabile e scadenza supera le soglie di pubblicazione. Contatori per: {c}.',
      ownWarn: 'Campione proprio: ogni modello con tutte le sue coppie, in stazioni e ore diverse. Utile per vedere i valori, non per confrontare i modelli.',
      commonEmpty: 'Non c\'è ancora un campione comune in questo gruppo e periodo: i modelli non condividono ancora le ore di inizio. Prova il campione proprio.',
      barsT: 'Errore assoluto medio per modello', barsS: 'Barra: MAE · linea: intervallo al 95 %',
      leadT: 'Errore per scadenza', leadS: 'MAE per ora di previsione, tutto il periodo disponibile',
      ref: 'Riferimento', vRefBetter: 'WRF migliore', vRefWorse: 'WRF peggiore', vTie: 'Nessuna differenza netta',
      stT: 'Previsione e osservazione per stazione', stS: 'Ultimi 14 giorni e previsione in corso · scadenza {l} h',
      station: 'Stazione', obs: 'Osservazione', now: 'ora', noData: 'Nessun dato per questa variabile.',
      noElev: 'senza correzione di quota', buoys: 'Boe', buoy: 'boa', allSt: 'Tutte le stazioni',
      grid: 'stazioni nella griglia da {k} km', h: 'h', updated: 'Aggiornato {d}', ciFew: 'Intervalli nascosti: meno di 7 giorni di dati.',
      free: 'piano Free', pro: 'griglia più fine', obsN: '{n} oss.'
    },
    nl: {
      loading: 'Gegevens laden…', err: 'De verificatiegegevens konden niet worden geladen.',
      group: 'Groep', win: 'Periode', lead: 'Termijn', sample: 'Steekproef', common: 'Gemeenschappelijk', own: 'Eigen',
      d30: '30 dagen', d90: '90 dagen', dall: 'Alles',
      v: { t2: 'Temperatuur', rh: 'Vochtigheid', slp: 'Luchtdruk', ws: 'Wind', wd: 'Richting' },
      vl: { t2: 'Temperatuur op 2 m', rh: 'Relatieve vochtigheid', slp: 'Luchtdruk op zeeniveau', ws: 'Windsnelheid op 10 m', wd: 'Windrichting' },
      tilesHelp: 'Het grote getal op elke kaart is de gemiddelde absolute fout (MAE): hoeveel het model gemiddeld afwijkt, ongeacht het teken. Hoe lager, hoe beter. De bias geeft de richting: positief als het te hoog voorspelt, negatief als te laag.',
      mae: 'MAE', bias: 'bias', rmse: 'RMSE', pairs: 'paren', stations: 'stations', days: 'dagen',
      min: 'min.', accH: 'Gegevens verzamelen', accP: 'Archief loopt sinds {d}. Elke combinatie van groep, variabele en termijn wordt gepubliceerd zodra WRF in de gemeenschappelijke steekproef de minima hieronder haalt; tot dan zijn de cijfers voorlopig. Tellers voor: {c}.',
      readyH: 'Voldoende gegevens voor deze selectie', readyP: 'Deze combinatie van groep, periode, variabele en termijn haalt de publicatiedrempels. Tellers voor: {c}.',
      ownWarn: 'Eigen steekproef: elk model met al zijn paren, op verschillende stations en tijden. Handig om cijfers te zien, niet om modellen te vergelijken.',
      commonEmpty: 'Nog geen gemeenschappelijke steekproef in deze groep en periode: de modellen delen nog geen begintijden. Probeer de eigen steekproef.',
      barsT: 'Gemiddelde absolute fout per model', barsS: 'Balk: MAE · lijn: 95%-interval',
      leadT: 'Fout per termijn', leadS: 'MAE per voorspellingsuur, hele beschikbare periode',
      ref: 'Referentie', vRefBetter: 'WRF beter', vRefWorse: 'WRF slechter', vTie: 'Geen duidelijk verschil',
      stT: 'Voorspelling en waarneming per station', stS: 'Laatste 14 dagen en lopende voorspelling · termijn {l} u',
      station: 'Station', obs: 'Waarneming', now: 'nu', noData: 'Geen gegevens voor deze variabele.',
      noElev: 'niet voor hoogte gecorrigeerd', buoys: 'Boeien', buoy: 'boei', allSt: 'Alle stations',
      grid: 'stations in het rooster van {k} km', h: 'u', updated: 'Bijgewerkt {d}', ciFew: 'Intervallen verborgen: minder dan 7 dagen gegevens.',
      free: 'Free-abonnement', pro: 'fijnste rooster', obsN: '{n} waarn.'
    }
  };
  var DOMN = {
    panama: 'Panamá', centro_america: { es: 'Centroamérica', en: 'Central America', pt: 'América Central', fr: 'Amérique centrale', it: 'America centrale', nl: 'Midden-Amerika' },
    cuba: 'Cuba', mexico: { es: 'México', en: 'Mexico', pt: 'México', fr: 'Mexique', it: 'Messico', nl: 'Mexico' },
    dominica: 'Dominica', dominicana: { es: 'Rep. Dominicana', en: 'Dominican Rep.', pt: 'Rep. Dominicana', fr: 'Rép. dominicaine', it: 'Rep. Dominicana', nl: 'Dominicaanse Rep.' },
    caribe: { es: 'Caribe', en: 'Caribbean', pt: 'Caribe', fr: 'Caraïbes', it: 'Caraibi', nl: 'Caribisch gebied' }
  };
  // Resolución de cada malla (km): igual que verif_common.DOMAINS / catalog.js
  var KM = { panama: { d01: 27, d02: 9, d03: 3 }, centro_america: { d01: 27, d02: 9 }, cuba: { d01: 27, d02: 9 },
    mexico: { d01: 25, d02: 5 }, dominica: { d01: 27, d02: 9 }, dominicana: { d01: 27, d02: 9 }, caribe: { d01: 9 } };
  var GLOB = {
    gfs: { name: 'GFS', sub: 'NOAA · 0,25°', c: '--m-gfs' },
    ifs: { name: 'IFS', sub: 'ECMWF · 0,1°', c: '--m-ifs' },
    aifs: { name: 'AIFS', sub: 'ECMWF · 0,25°', c: '--m-aifs' },
    icon: { name: 'ICON', sub: 'DWD · 13 km', c: '--m-icon' }
  };
  var ORDER_G = ['gfs', 'ifs', 'aifs', 'icon'];
  var UNIT = { t2: '°C', rh: '%', slp: 'hPa', ws: 'm/s', wd: '°' };
  var DEC = { t2: 2, rh: 1, slp: 2, ws: 2, wd: 0 };
  var VIDX = { t2: 1, rh: 2, slp: 3, ws: 4, wd: 5 };   // índice en las filas de obs (los modelos van +1)

  function L() { var l = document.documentElement.getAttribute('data-lang'); return T[l] ? l : 'en'; }
  function t(k) { return T[L()][k]; }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function num(x, d) {
    if (x == null || isNaN(x)) return '—';
    return Number(x).toLocaleString(L(), { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function dname(d) { var x = DOMN[d]; return typeof x === 'string' ? x : x ? x[L()] : d; }
  function cssv(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dfmt(iso, withHour) {
    var o = { day: 'numeric', month: 'short', timeZone: 'UTC' };
    if (withHour) { o.hour = '2-digit'; o.minute = '2-digit'; o.hourCycle = 'h23'; }
    return new Intl.DateTimeFormat(L(), o).format(new Date(iso)) + (withHour ? ' UTC' : '');
  }

  // ------------------------------------------------------------ modelos: nombre, color y trazo
  // En un grupo de dominio las mallas WRF comparten el azul y se distinguen por el trazo:
  // la más fina continua, las demás discontinuas (y la leyenda lo muestra).
  function wrfGrids(labels) {
    return labels.filter(function (x) { return x.indexOf('wrf:') === 0; }).sort(function (a, b) { return b.localeCompare(a); });
  }
  function style(label, labels) {
    if (GLOB[label]) return { c: cssv(GLOB[label].c), dash: null, op: 1 };
    if (label === 'wrf_pro') return { c: cssv('--m-wrf'), dash: null, op: 1 };
    if (label === 'wrf_free') return { c: cssv('--m-wrf'), dash: '6 4', op: .55 };
    var g = wrfGrids(labels || [label]).filter(function (x, k, a) { return a.indexOf(x) === k; });
    var i = Math.min(2, Math.max(0, g.indexOf(label)));
    return { c: cssv('--m-wrf'), dash: [null, '6 4', '2 3'][i], op: [1, .6, .45][i] };
  }
  function mname(label) {
    if (GLOB[label]) return { n: GLOB[label].name, s: GLOB[label].sub };
    if (label === 'wrf_pro') return { n: 'WRF Pro', s: t('pro') };
    if (label === 'wrf_free') return { n: 'WRF Free', s: t('free') };
    var p = label.split(':'), k = (KM[p[1]] || {})[p[2]];
    return { n: 'WRF ' + (k || '?') + ' km', s: dname(p[1]) + ' · ' + p[2] };
  }
  function ordered(labels) {
    var w = labels.filter(function (x) { return !GLOB[x]; }).sort(function (a, b) {
      var r = function (x) { return x === 'wrf_pro' ? 0 : x === 'wrf_free' ? 1 : 0; };
      return r(a) - r(b) || b.localeCompare(a);
    });
    return w.concat(ORDER_G.filter(function (g) { return labels.indexOf(g) >= 0; }));
  }

  // ------------------------------------------------------------ estado
  var S = null, st = { cohort: 'all', win: 'all', bin: '0', sample: null, v: 't2', station: null };
  var hidden = {};
  var seriesCache = {};

  function cohortName(cid) {
    if (cid === 'all') return t('allSt');
    var p = cid.split('.'), k = (KM[p[0]] || {})[p[1]];
    return dname(p[0]) + ' · ' + fmt(t('grid'), { k: k });
  }
  function curWin() { return S.cohorts[st.cohort].windows[st.win]; }
  function hasCommon(w) {
    var r = w.common.results;
    for (var v in r) for (var b in r[v]) for (var l in r[v][b]) if (r[v][b][l].n > 0) return true;
    return false;
  }

  // ------------------------------------------------------------ interfaz
  function seg(name, opts, cur, onPick) {
    var d = el('div', { 'class': 'vf-seg', role: 'group', 'aria-label': name });
    opts.forEach(function (o) {
      var b = el('button', { type: 'button', 'aria-pressed': String(o[0] === cur) }, esc(o[1]));
      b.addEventListener('click', function () { onPick(o[0]); });
      d.appendChild(b);
    });
    return d;
  }
  function field(label, ctrl) {
    var f = el('label', { 'class': 'vf-f' });
    f.appendChild(el('span', null, esc(label)));
    f.appendChild(ctrl);
    return f;
  }

  function renderState() {
    var box = document.getElementById('vf-state'); if (!box) return;
    // Umbrales por celda (F7): referencia WRF en la muestra común, para la variable y el plazo elegidos
    var c = S.cohorts[st.cohort], th = c.thresholds || S.thresholds;
    var r = (((curWin().common.results || {})[st.v] || {})[st.bin] || {})[c.ref] || {};
    var ready = !!r.publishable;
    var cell = t('vl')[st.v] + ', ' + S.bins[+st.bin][0] + '–' + S.bins[+st.bin][1] + ' ' + t('h');
    box.hidden = false;
    box.classList.toggle('ready', ready);
    document.getElementById('vf-state-h').textContent = ready ? t('readyH') : t('accH');
    document.getElementById('vf-state-p').textContent = fmt(ready ? t('readyP') : t('accP'), { d: dfmt(S.data_since), c: cell });
    var m = document.getElementById('vf-meters'); m.innerHTML = '';
    [['days', r.days || 0, th.days], ['stations', r.stations || 0, th.stations], ['pairs', r.n || 0, th.pairs]].forEach(function (x) {
      var pct = Math.min(100, Math.round(100 * x[1] / x[2])), met = x[1] >= x[2];
      m.appendChild(el('div', { 'class': 'vf-meter' + (met ? ' met' : '') },
        '<small><span>' + (met ? '✓ ' : '') + esc(t(x[0])) + '</span><span><b>' + num(x[1], 0) + '</b> · ' + esc(t('min')) + ' ' + num(x[2], 0) + '</span></small>' +
        '<i><span style="width:' + pct + '%"></span></i>'));
    });
  }

  function render() {
    if (!S) return;
    var w = curWin();
    if (!st.sample) st.sample = hasCommon(w) ? 'common' : 'own';
    renderState();
    root.innerHTML = '';

    // Filtros
    var fl = el('div', { 'class': 'vf-filters' });
    var sel = el('select', { 'class': 'vf-sel' });
    Object.keys(S.cohorts).forEach(function (cid) {
      var o = el('option', { value: cid }, esc(cohortName(cid) + ' (' + S.cohorts[cid].stations + ')'));
      if (cid === st.cohort) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { st.cohort = sel.value; st.sample = null; st.station = null; render(); });
    fl.appendChild(field(t('group'), sel));
    fl.appendChild(field(t('win'), seg(t('win'), [['30', t('d30')], ['90', t('d90')], ['all', t('dall')]], st.win, function (x) { st.win = x; st.sample = null; render(); })));
    fl.appendChild(field(t('lead'), seg(t('lead'), S.bins.map(function (b, i) { return [String(i), b[0] + '–' + b[1] + ' ' + t('h')]; }), st.bin, function (x) { st.bin = x; render(); })));
    fl.appendChild(field(t('sample'), seg(t('sample'), [['common', t('common')], ['own', t('own')]], st.sample, function (x) { st.sample = x; render(); })));
    root.appendChild(fl);

    root.appendChild(seg(t('v').t2, ['t2', 'rh', 'slp', 'ws', 'wd'].map(function (v) { return [v, t('v')[v]]; }), st.v, function (x) { st.v = x; render(); }));
    root.lastChild.classList.add('vf-vars');

    var ws = w[st.sample];
    if (st.sample === 'own') root.appendChild(el('p', { 'class': 'vf-note warn' }, esc(t('ownWarn'))));
    else if (!hasCommon(w)) root.appendChild(el('p', { 'class': 'vf-note warn' }, esc(t('commonEmpty'))));

    var c = S.cohorts[st.cohort], labels = ordered(c.labels);
    var res = ((ws.results || {})[st.v] || {})[st.bin] || {};
    var showCI = ws.days >= 7;

    // Tarjetas
    root.appendChild(el('p', { 'class': 'vf-note' }, esc(t('tilesHelp'))));
    var tiles = el('div', { 'class': 'vf-tiles' });
    labels.forEach(function (lab) {
      var r = res[lab], nm = mname(lab), s = style(lab, c.labels);
      var tile = el('div', { 'class': 'vf-tile' + (lab === c.ref ? ' ref' : '') + (r ? '' : ' empty'), style: '--c:' + s.c });
      var h = '<h4>' + esc(nm.n) + '<small>' + esc(nm.s) + (lab === c.ref ? ' · ' + esc(t('ref')) : '') + '</small></h4>';
      if (r) {
        h += '<div class="lbl">' + esc(t('mae')) + '</div>' +
          '<div class="big">' + num(r.mae, DEC[st.v]) + '<small>' + UNIT[st.v] + '</small></div>' +
          '<div class="meta">' + esc(t('bias')) + ' ' + (r.bias > 0 ? '+' : '') + num(r.bias, DEC[st.v]) + ' · ' + esc(t('rmse')) + ' ' + num(r.rmse, DEC[st.v]) + '</div>' +
          '<div class="meta">' + num(r.n, 0) + ' ' + esc(t('pairs')) + ' · ' + num(r.stations, 0) + ' ' + esc(t('stations')) + '</div>';
        if (st.v === 't2' && S.method.no_elev.indexOf(lab) >= 0) h += '<span class="vf-chip neutral">' + esc(t('noElev')) + '</span>';
        if (r.vs_ref && st.sample === 'common' && (res[c.ref] || {}).publishable) {
          var vd = r.vs_ref.verdict;
          h += ' <span class="vf-chip ' + (vd === 'ref_better' ? 'good' : vd === 'ref_worse' ? 'warn' : 'neutral') + '">' +
            esc(t(vd === 'ref_better' ? 'vRefBetter' : vd === 'ref_worse' ? 'vRefWorse' : 'vTie')) + '</span>';
        }
      } else {
        h += '<div class="big">—</div><div class="meta">' + esc(t('noData')) + '</div>';
      }
      tile.innerHTML = h;
      tiles.appendChild(tile);
    });
    root.appendChild(tiles);

    // Barras y curva por plazo
    var g2 = el('div', { 'class': 'vf-grid2' });
    var cb = el('div', { 'class': 'vf-chart' });
    cb.appendChild(el('h3', null, esc(t('barsT')) + ' · ' + esc(t('vl')[st.v])));
    cb.appendChild(el('p', { 'class': 'sub' }, esc(showCI ? t('barsS') : t('ciFew'))));
    g2.appendChild(cb);
    var cl = el('div', { 'class': 'vf-chart' });
    cl.appendChild(el('h3', null, esc(t('leadT')) + ' · ' + esc(t('vl')[st.v])));
    cl.appendChild(el('p', { 'class': 'sub' }, esc(t('leadS'))));
    g2.appendChild(cl);
    root.appendChild(g2);
    bars(cb, labels, res, c, showCI);
    leadChart(cl, labels, ((S.cohorts[st.cohort].windows.all[st.sample].lead || {})[st.v]) || {}, c);

    // Estación
    stationBlock();
  }

  // ------------------------------------------------------------ gráfica de barras (horizontal)
  function bars(box, labels, res, c, showCI) {
    var rows = labels.filter(function (l) { return res[l]; });
    if (!rows.length) { box.appendChild(el('div', { 'class': 'empty' }, esc(t('noData')))); return; }
    var W = Math.max(300, box.clientWidth - 28), rowH = 30, padL = 112, padR = 54, top = 6;
    var H = top + rows.length * rowH + 22;
    var max = 0;
    rows.forEach(function (l) { var r = res[l]; max = Math.max(max, showCI && r.mae_ci ? r.mae_ci[1] : r.mae); });
    max = nice(max * 1.05);
    var x = function (v) { return padL + (W - padL - padR) * v / max; };
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('barsT') });
    ticks(0, max, 4).forEach(function (v) {
      sv('line', { x1: x(v), x2: x(v), y1: top, y2: H - 20, 'class': v ? 'vx-grid' : 'vx-axis' }, svg);
      sv('text', { x: x(v), y: H - 6, 'text-anchor': 'middle', 'class': 'vx-tick' }, svg).textContent = num(v, tdec(max / 4));
    });
    var tip = el('div', { 'class': 'vf-tip' });
    rows.forEach(function (l, i) {
      var r = res[l], s = style(l, c.labels), y = top + i * rowH, nm = mname(l);
      var lab = sv('text', { x: padL - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'class': 'vx-lab' + (l === c.ref ? ' ref' : '') }, svg);
      lab.textContent = nm.n;
      var bw = Math.max(2, x(r.mae) - padL);
      var bar = sv('path', { d: roundBar(padL, y + 7, bw, rowH - 14, 4), fill: s.c, 'fill-opacity': s.op, 'class': 'vx-bar' }, svg);
      if (s.dash) sv('path', { d: roundBar(padL, y + 7, bw, rowH - 14, 4), fill: 'none', stroke: s.c, 'stroke-width': 1.2, 'stroke-dasharray': s.dash }, svg);
      if (showCI && r.mae_ci) {
        var cy = y + rowH / 2;
        sv('line', { x1: x(r.mae_ci[0]), x2: x(r.mae_ci[1]), y1: cy, y2: cy, 'class': 'vx-ci' }, svg);
        sv('line', { x1: x(r.mae_ci[0]), x2: x(r.mae_ci[0]), y1: cy - 4, y2: cy + 4, 'class': 'vx-ci' }, svg);
        sv('line', { x1: x(r.mae_ci[1]), x2: x(r.mae_ci[1]), y1: cy - 4, y2: cy + 4, 'class': 'vx-ci' }, svg);
      }
      var vx = Math.max(x(r.mae), showCI && r.mae_ci ? x(r.mae_ci[1]) : 0) + 6;
      sv('text', { x: vx, y: y + rowH / 2 + 4, 'class': 'vx-val' }, svg).textContent = num(r.mae, DEC[st.v]);
      var hit = sv('rect', { x: 0, y: y, width: W, height: rowH, 'class': 'vx-hit' }, svg);
      hit.addEventListener('pointerenter', function () {
        tip.innerHTML = '<b>' + esc(nm.n) + ' · ' + esc(nm.s) + '</b><table>' +
          '<tr><td>' + t('mae') + '</td><td>' + num(r.mae, DEC[st.v]) + ' ' + UNIT[st.v] + '</td></tr>' +
          (r.mae_ci && showCI ? '<tr><td>95 %</td><td>' + num(r.mae_ci[0], DEC[st.v]) + ' – ' + num(r.mae_ci[1], DEC[st.v]) + '</td></tr>' : '') +
          '<tr><td>' + esc(t('bias')) + '</td><td>' + (r.bias > 0 ? '+' : '') + num(r.bias, DEC[st.v]) + '</td></tr>' +
          '<tr><td>' + t('rmse') + '</td><td>' + num(r.rmse, DEC[st.v]) + '</td></tr>' +
          '<tr><td>' + esc(t('pairs')) + '</td><td>' + num(r.n, 0) + '</td></tr>' +
          '<tr><td>' + esc(t('days')) + '</td><td>' + num(r.days, 0) + '</td></tr></table>';
        tip.classList.add('on');
        tip.style.top = (y + 52) + 'px';
        tip.style.left = Math.min(box.clientWidth - tip.offsetWidth - 8, x(r.mae) + 24) + 'px';
      });
      hit.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
    });
    box.appendChild(svg);
    box.appendChild(tip);
  }
  function roundBar(x, y, w, h, r) {   // extremo de datos redondeado, base recta
    r = Math.min(r, w, h / 2);
    return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z';
  }
  function nice(v) {
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function tdec(range) { var st = nice(range); return st >= 1 ? 0 : st >= .1 ? 1 : 2; }
  function ticks(a, b, n) {
    var step = nice((b - a) / n), out = [], v = Math.ceil(a / step) * step;
    for (; v <= b + step * 1e-6; v += step) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  }

  // ------------------------------------------------------------ leyenda que oculta series
  function legend(box, items, onChange) {
    var d = el('div', { 'class': 'vf-legend' });
    items.forEach(function (it) {
      var b = el('button', { type: 'button', 'aria-pressed': String(!hidden[it.id]), style: '--c:' + it.c });
      b.innerHTML = '<i class="' + (it.obs ? 'obs' : it.dash === '2 3' ? 'dot' : it.dash ? 'dash' : '') + '"></i>' + esc(it.n);
      b.addEventListener('click', function () {
        hidden[it.id] = !hidden[it.id];
        b.setAttribute('aria-pressed', String(!hidden[it.id]));
        onChange();
      });
      d.appendChild(b);
    });
    box.appendChild(d);
  }

  // ------------------------------------------------------------ gráfica de líneas genérica
  // series: [{id, n, c, dash, op, pts:[[x,y]], obs}] · x numérico (h o ms)
  function lineChart(box, series, o) {
    var holder = el('div');
    box.appendChild(holder);
    function draw() {
      holder.innerHTML = '';
      var vis = series.filter(function (s) { return !hidden[s.id] && s.pts.length; });
      if (!vis.length) { holder.appendChild(el('div', { 'class': 'empty' }, esc(t('noData')))); return; }
      var W = Math.max(300, box.clientWidth - 28), H = o.h || 240, pl = 44, pr = 12, pt = 10, pb = 26;
      var xs = [], ys = [];
      vis.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); if (p[1] != null) ys.push(p[1]); }); });
      var x0 = o.x0 != null ? o.x0 : Math.min.apply(null, xs), x1 = o.x1 != null ? o.x1 : Math.max.apply(null, xs);
      if (x1 === x0) x1 = x0 + 1;
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      if (o.yZero) y0 = 0;
      if (o.yFix) { y0 = o.yFix[0]; y1 = o.yFix[1]; }
      var pad = (y1 - y0) * .08 || 1; if (!o.yFix) { y1 += pad; if (!o.yZero) y0 -= pad; }
      var X = function (v) { return pl + (W - pl - pr) * (v - x0) / (x1 - x0); };
      var Y = function (v) { return pt + (H - pt - pb) * (1 - (v - y0) / (y1 - y0)); };
      var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '' });
      if (o.now != null && o.now < x1) sv('rect', { x: X(Math.max(o.now, x0)), y: pt, width: X(x1) - X(Math.max(o.now, x0)), height: H - pt - pb, 'class': 'vx-future' }, svg);
      (o.yTicks || ticks(y0, y1, 4)).forEach(function (v) {
        if (v < y0 || v > y1) return;
        sv('line', { x1: pl, x2: W - pr, y1: Y(v), y2: Y(v), 'class': 'vx-grid' }, svg);
        sv('text', { x: pl - 6, y: Y(v) + 3.5, 'text-anchor': 'end', 'class': 'vx-tick' }, svg).textContent = num(v, tdec((y1 - y0) / 4));
      });
      sv('line', { x1: pl, x2: W - pr, y1: H - pb, y2: H - pb, 'class': 'vx-axis' }, svg);
      o.xTicks(x0, x1).forEach(function (tk) {
        sv('line', { x1: X(tk[0]), x2: X(tk[0]), y1: H - pb, y2: H - pb + 4, 'class': 'vx-axis' }, svg);
        sv('text', { x: X(tk[0]), y: H - 8, 'text-anchor': 'middle', 'class': 'vx-tick' }, svg).textContent = tk[1];
      });
      if (o.now != null && o.now >= x0 && o.now <= x1) {
        sv('line', { x1: X(o.now), x2: X(o.now), y1: pt, y2: H - pb, 'class': 'vx-now' }, svg);
        sv('text', { x: X(o.now) + 4, y: pt + 10, 'class': 'vx-nowlab' }, svg).textContent = t('now');
      }
      vis.forEach(function (s) {
        if (!o.dotsOnly) {
          var d = '', pen = false, gap = o.gap || Infinity, prev = null;
          s.pts.forEach(function (p) {
            if (p[1] == null) { pen = false; return; }
            if (prev != null && p[0] - prev > gap) pen = false;
            d += (pen ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1);
            pen = true; prev = p[0];
          });
          sv('path', { d: d, 'class': s.obs ? 'vx-obs' : 'vx-line', stroke: s.obs ? null : s.c, 'stroke-dasharray': s.dash, 'stroke-opacity': s.op }, svg);
        }
        if (s.obs || o.dotsOnly) {
          s.pts.forEach(function (p) {
            if (p[1] == null) return;
            sv('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.obs ? 2.4 : 2.2, fill: s.obs ? cssv('--m-obs') : s.c, 'fill-opacity': s.op }, svg);
          });
        }
      });
      // Cursor y ficha
      var cur = sv('line', { y1: pt, y2: H - pb, 'class': 'vx-cursor' }, svg);
      var hit = sv('rect', { x: pl, y: pt, width: W - pl - pr, height: H - pt - pb, 'class': 'vx-hit' }, svg);
      var tip = el('div', { 'class': 'vf-tip' });
      var allx = []; vis.forEach(function (s) { s.pts.forEach(function (p) { if (p[1] != null && allx.indexOf(p[0]) < 0) allx.push(p[0]); }); });
      allx.sort(function (a, b) { return a - b; });
      function move(ev) {
        var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width, xv = x0 + (px - pl) / (W - pl - pr) * (x1 - x0);
        var best = null; allx.forEach(function (v) { if (best == null || Math.abs(v - xv) < Math.abs(best - xv)) best = v; });
        if (best == null) return;
        cur.setAttribute('x1', X(best)); cur.setAttribute('x2', X(best)); cur.classList.add('on');
        var rows = '';
        vis.forEach(function (s) {
          for (var i = 0; i < s.pts.length; i++) if (s.pts[i][0] === best && s.pts[i][1] != null) {
            rows += '<tr><td style="--c:' + (s.obs ? cssv('--m-obs') : s.c) + '"><i></i>' + esc(s.n) + '</td><td>' + num(s.pts[i][1], o.dec) + (o.unit ? ' ' + o.unit : '') + '</td></tr>';
            break;
          }
        });
        tip.innerHTML = '<b>' + esc(o.xLabel(best)) + '</b><table>' + rows + '</table>';
        tip.classList.add('on');
        var bx = X(best) * r.width / W;
        tip.style.left = (bx + 16 + tip.offsetWidth > box.clientWidth ? Math.max(4, bx - tip.offsetWidth - 2) : bx + 30) + 'px';
      }
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', function () { cur.classList.remove('on'); tip.classList.remove('on'); });
      holder.appendChild(svg);
      holder.appendChild(tip);
    }
    draw();
    return draw;
  }

  function leadChart(box, labels, lead, c) {
    var series = labels.filter(function (l) { return lead[l]; }).map(function (l) {
      var s = style(l, c.labels);
      return { id: l, n: mname(l).n, c: s.c, dash: s.dash, op: Math.max(s.op, .7), pts: lead[l].map(function (p) { return [p[0], p[1]]; }) };
    });
    if (!series.length) { box.appendChild(el('div', { 'class': 'empty' }, esc(t('noData')))); return; }
    var redraw;
    legend(box, series, function () { redraw(); });
    redraw = lineChart(box, series, {
      h: 220, x0: 0, x1: 72, yZero: true, dec: DEC[st.v], unit: UNIT[st.v], label: t('leadT'), gap: 6,
      xTicks: function () { return [0, 12, 24, 36, 48, 60, 72].map(function (h) { return [h, h + ' ' + t('h')]; }); },
      xLabel: function (h) { return '+' + h + ' ' + t('h'); }
    });
  }

  // ------------------------------------------------------------ serie por estación
  function stationBlock() {
    var sec = el('section', { 'class': 'vf-station' });
    sec.appendChild(el('h2', null, esc(t('stT'))));
    var ids = Object.keys(S.stations).filter(function (id) {
      var s = S.stations[id];
      return s.n_obs > 0 && (st.cohort === 'all' || (s.cohorts || [s.cohort]).indexOf(st.cohort) >= 0);
    });
    if (!ids.length) { sec.appendChild(el('p', { 'class': 'vf-note' }, esc(t('noData')))); root.appendChild(sec); return; }
    if (!st.station || ids.indexOf(st.station) < 0) {
      st.station = ids.indexOf('MUHA') >= 0 ? 'MUHA' : ids.sort(function (a, b) { return S.stations[b].n_obs - S.stations[a].n_obs; })[0];
    }
    // Agrupadas por país; las boyas aparte
    var groups = {};
    ids.forEach(function (id) {
      var s = S.stations[id], g = s.kind === 'buoy' ? '~' + t('buoys') : (s.country || '—');
      (groups[g] = groups[g] || []).push(id);
    });
    var sel = el('select', { 'class': 'vf-sel' });
    Object.keys(groups).sort().forEach(function (g) {
      var og = el('optgroup', { label: g.replace(/^~/, '') });
      groups[g].sort(function (a, b) { return S.stations[a].name.localeCompare(S.stations[b].name); }).forEach(function (id) {
        var o = el('option', { value: id }, esc(S.stations[id].name + ' (' + id + ')'));
        if (id === st.station) o.selected = true;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    sel.addEventListener('change', function () { st.station = sel.value; loadSeries(); });
    var fl = el('div', { 'class': 'vf-filters' });
    fl.appendChild(field(t('station'), sel));
    sec.appendChild(fl);
    var box = el('div', { 'class': 'vf-chart' });
    box.id = 'vf-series';
    sec.appendChild(box);
    root.appendChild(sec);
    loadSeries();
  }

  function loadSeries() {
    var id = st.station, box = document.getElementById('vf-series');
    if (!box) return;
    if (seriesCache[id]) return drawSeries(box, seriesCache[id]);
    box.innerHTML = '<div class="empty">' + esc(t('loading')) + '</div>';
    fetch(API + '/v1/verif/series/' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) { seriesCache[id] = d; if (st.station === id) drawSeries(box, d); })
      .catch(function () { box.innerHTML = '<div class="empty">' + esc(t('err')) + '</div>'; });
  }

  function drawSeries(box, d) {
    box.innerHTML = '';
    var s = S.stations[d.station] || {}, v = st.v, vi = VIDX[v];
    var labels = Object.keys(d.models || {});
    var cl = (S.cohorts[s.cohort] || S.cohorts.all).labels;
    var lab = ordered(labels);
    box.appendChild(el('h3', null, esc(d.name + ' (' + d.station + ')') + ' · ' + esc(t('vl')[v])));
    box.appendChild(el('p', { 'class': 'sub' }, esc(fmt(t('stS'), { l: S.bins[+st.bin][0] + '–' + S.bins[+st.bin][1] })) + ' · ' +
      esc(d.kind === 'buoy' ? t('buoy') : 'METAR') + ' · ' + num(d.elev, 0) + ' m · ' + esc(fmt(t('obsN'), { n: (d.obs || []).length }))));
    var series = [{ id: 'obs', n: t('obs'), obs: true, c: cssv('--m-obs'), pts: (d.obs || []).map(function (r) { return [Date.parse(r[0]), r[vi]]; }) }];
    lab.forEach(function (m) {
      var rows = (d.models[m] || {})[st.bin] || [], sty = style(m, labels.concat(cl));
      series.push({ id: m, n: mname(m).n, c: sty.c, dash: sty.dash, op: Math.max(sty.op, .7),
        pts: rows.map(function (r) { return [Date.parse(r[0]), r[vi + 1]]; }) });
    });
    var now = Date.parse(S.generated), day = 864e5;
    var x0 = Infinity;
    series.forEach(function (sr) { sr.pts.forEach(function (p) { if (p[1] != null && p[0] < x0) x0 = p[0]; }); });
    x0 = Math.max(x0, now - 14 * day);
    var redraw;
    legend(box, series, function () { redraw(); });
    redraw = lineChart(box, series, {
      h: 280, x0: x0, now: now, dec: v === 'wd' ? 0 : 1, unit: UNIT[v], label: t('stT'), gap: 7 * 36e5,
      dotsOnly: v === 'wd', yFix: v === 'wd' ? [0, 360] : null, yTicks: v === 'wd' ? [0, 90, 180, 270, 360] : null,
      xTicks: function (a, b) {
        var out = [], step = (b - a) / day > 8 ? 2 : 1, t0 = Math.ceil(a / day) * day;
        for (var x = t0; x <= b; x += step * day) out.push([x, dfmt(new Date(x).toISOString())]);
        return out;
      },
      xLabel: function (x) { return dfmt(new Date(x).toISOString(), true); }
    });
  }

  // ------------------------------------------------------------ arranque
  var ld = document.getElementById('vf-loading');
  if (ld) ld.textContent = t('loading');
  fetch(API + '/v1/verif/summary').then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (d) {
    S = d;
    if (!S.cohorts[st.cohort]) st.cohort = Object.keys(S.cohorts)[0];
    render();
  }).catch(function () {
    root.innerHTML = '<p class="vf-note warn">' + esc(t('err')) + '</p>';
  });

  // Idioma, tamaño y tema: volver a dibujar
  new MutationObserver(function () { render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 200); });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { render(); });
  }
})();
