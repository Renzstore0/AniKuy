const $=id=>document.getElementById(id),
  form=$("searchForm"),input=$("searchInput"),info=$("searchResultInfo"),grid=$("searchResultGrid");
let t;

const setUrlQ=q=>{
  const p=new URLSearchParams(location.search);
  q?p.set("q",q):p.delete("q");
  const s=p.toString();
  history.replaceState({}, "", s?`${location.pathname}?${s}`:location.pathname);
};

const clearResult=()=>{if(grid)grid.innerHTML="";if(info)info.textContent=""};

async function performSearch(q){
  if(!grid||!info) return;
  q=(q||"").trim();
  if(!q){clearResult();setUrlQ("");return}
  let json; try{ json=await apiGet(`/anime/samehadaku/search?q=${encodeURIComponent(q)}`) }catch{ return }
  if(!json||json.status!=="success"||!json.data) return;

  const list=Array.isArray(json.data.animeList)?json.data.animeList:[];
  grid.innerHTML=""; info.textContent=`${list.length} hasil untuk "${q}"`;

  list.forEach(a=>{
    grid.appendChild(createAnimeCard(
      {title:a.title||"-",poster:a.poster||"",slug:a.animeId||"",animeId:a.animeId},
      {rating:a.score||"N/A",badgeBottom:a.status||a.type||"",meta:(a.genreList||[]).map(g=>g.title).join(", ")}
    ));
  });

  setUrlQ(q);
}

const onInput=()=>{
  if(!input) return;
  const v=input.value.trim();
  if(!v){clearResult();setUrlQ("");return}
  if(v.length<2) return;
  clearTimeout(t); t=setTimeout(()=>performSearch(v),400);
};

if(form&&input){
  form.addEventListener("submit",e=>{e.preventDefault();performSearch(input.value)});
  input.addEventListener("input",onInput);
}

document.addEventListener("DOMContentLoaded",()=>{
  const q=new URLSearchParams(location.search).get("q");
  if(q&&input){input.value=q;performSearch(q)}
});
