(() => {
  const $ = (s) => document.querySelector(s);
  const fmt = (n, d=1) => (n==null || Number.isNaN(n)) ? '—' : Number(n).toFixed(d);
  const pct = (n) => (n==null || Number.isNaN(n)) ? '—' : `${n>0?'+':''}${Number(n).toFixed(2)}%`;
  const cls = (n) => n==null? 'flat' : n>0? 'pos' : n<0? 'neg' : 'flat';

  function scoreColor(s){
    if (s==null) return '#8b9bb0';
    if (s > 0.15) return '#ef5350';
    if (s < -0.15) return '#26a69a';
    return '#f59e0b';
  }

  async function load(){
    const res = await fetch('./data/dashboard.json', {cache:'no-store'});
    if(!res.ok) throw new Error('无法加载 dashboard.json');
    return res.json();
  }

  function renderBanner(d){
    const bias = d.advice?.bias_cn || '—';
    const action = d.advice?.action || '';
    const summary = d.advice?.summary || d.advice?.action || '—';
    $('#season').textContent = d.season_cn || d.season || '—';
    $('#updated').textContent = d.updated_at || '—';
    $('#bias').textContent = bias;
    $('#summary').textContent = summary;
    $('#action').textContent = action;
  }

  function renderKpis(d){
    const p = d.price || {};
    $('#px').textContent = fmt(p.price, 3);
    $('#px-asof').textContent = p.asof ? `截至 ${p.asof}` : '';
    $('#chg1').textContent = pct(p.chg_1d);
    $('#chg1').className = 'v ' + cls(p.chg_1d);
    $('#chg5').textContent = pct(p.chg_5d);
    $('#chg5').className = 'v ' + cls(p.chg_5d);
    $('#comp').textContent = fmt(d.composite_100, 1);
    $('#comp').className = 'big ' + cls(d.composite_100);
    $('#conf').textContent = fmt(d.confidence, 0);
    $('#agree').textContent = d.agreement==null? '—' : fmt(d.agreement*100, 0)+'%';
  }

  function renderFactors(d){
    const box = $('#factors');
    const factors = Array.isArray(d.factors) ? d.factors : [];
    if(!factors.length){ box.innerHTML = '<p class="muted">暂无因子</p>'; return; }
    box.innerHTML = factors.map(f => {
      const s = f.score;
      const w = Math.min(100, Math.abs(s||0)*100);
      const color = scoreColor(s);
      return `<div class="factor">
        <div>
          <div><strong>${f.name||f.key||'因子'}</strong> <span class="muted">权重 ${fmt(f.base_weight,0)}</span></div>
          <div class="muted" style="margin-top:4px">${f.reading||f.detail||f.why||''}</div>
          <div class="bar"><i style="width:${w}%;background:${color};margin-left:${s<0? (100-w):0}%"></i></div>
        </div>
        <div class="${cls(s)}" style="font-weight:700;font-size:1.1rem">${fmt(s,2)}</div>
      </div>`;
    }).join('');
  }

  function renderNews(d){
    const ul = $('#news');
    const items = (d.news && (d.news.items || d.news.articles || d.news)) || [];
    const list = Array.isArray(items) ? items.slice(0,8) : [];
    if(!list.length){ ul.innerHTML = '<li class="muted">暂无新闻</li>'; return; }
    ul.innerHTML = list.map(n => {
      const t = n.title || n.headline || '新闻';
      const u = n.url || n.link || '#';
      const s = n.source || n.publisher || '';
      return `<li><a href="${u}" target="_blank" rel="noopener">${t}</a> <span class="muted">${s}</span></li>`;
    }).join('');
  }

  function renderEvents(d){
    const ul = $('#events');
    const list = Array.isArray(d.events) ? d.events.slice(0,8) : [];
    if(!list.length){ ul.innerHTML = '<li class="muted">暂无事件</li>'; return; }
    ul.innerHTML = list.map(e => {
      const t = e.title || e.name || e.text || JSON.stringify(e).slice(0,80);
      return `<li>${t}</li>`;
    }).join('');
  }

  function renderChart(d){
    const el = $('#chart');
    if(!window.echarts){ el.textContent='图表库未加载'; return; }
    const bars = (d.price && d.price.bars) || [];
    if(!bars.length){ el.innerHTML='<p class="muted">暂无K线</p>'; return; }
    const chart = echarts.init(el);
    const dates = bars.map(b=>b.date);
    const ohlc = bars.map(b=>[b.open,b.close,b.low,b.high]);
    chart.setOption({
      backgroundColor:'transparent',
      tooltip:{trigger:'axis'},
      grid:{left:48,right:16,top:24,bottom:40},
      xAxis:{type:'category',data:dates,axisLabel:{color:'#8b9bb0'},axisLine:{lineStyle:{color:'#243041'}}},
      yAxis:{scale:true,axisLabel:{color:'#8b9bb0'},splitLine:{lineStyle:{color:'#1c2633'}}},
      dataZoom:[{type:'inside'},{type:'slider',height:18,bottom:8}],
      series:[{type:'candlestick',name:'NG',data:ohlc,
        itemStyle:{color:'#ef5350',color0:'#26a69a',borderColor:'#ef5350',borderColor0:'#26a69a'}}]
    });
    window.addEventListener('resize', ()=>chart.resize());
  }

  function renderHistory(d){
    const ul = $('#history');
    const hist = Array.isArray(d.history) ? d.history.slice(-8).reverse() : [];
    if(!hist.length){ ul.innerHTML='<li class="muted">暂无历史评分</li>'; return; }
    ul.innerHTML = hist.map(h=>{
      const t = h.time || h.ts || h.date || '';
      const s = h.score ?? h.composite_100 ?? h.composite;
      const p = h.price;
      return `<li><span class="muted">${t}</span> · 分 <b class="${cls(s)}">${fmt(s,1)}</b> · 价 ${fmt(p,3)}</li>`;
    }).join('');
  }

  (async () => {
    try{
      const d = await load();
      renderBanner(d);
      renderKpis(d);
      renderFactors(d);
      renderNews(d);
      renderEvents(d);
      renderHistory(d);
      renderChart(d);
      $('#status').textContent = '已加载快照';
      $('#status').style.color = '#26a69a';
    }catch(err){
      console.error(err);
      $('#status').textContent = '加载失败：' + (err.message||err);
      $('#status').style.color = '#ef5350';
    }
  })();
})();
