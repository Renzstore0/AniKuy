const grid=document.getElementById("movieGrid"),
      loadingEl=document.getElementById("movieLoading"),
      endEl=document.getElementById("movieEnd"),
      main=document.getElementById("mainContent");

let page=1,last=1,loading=false;

const setLoading=v=>loadingEl&&loadingEl.classList.toggle("show",!!v);
const setEnd=v=>endEl&&endEl.classList.toggle("hidden",!v);

async function loadMovieList(p=1,append=false){
  if(!grid||loading) return;
  loading=true; setLoading(1); setEnd(0);

  let json;
  try{ json=await apiGet(`/anime/samehadaku/movies?page=${encodeURIComponent(p)}`) }
  catch{ loading=false; return setLoading(0) }

  if(!json||json.status!=="success"){ loading=false; return setLoading(0) }

  const pag=json.pagination||{};
  page=pag.currentPage||p;
  last=pag.totalPages||last;

  if(!append) grid.innerHTML="";

  (json.data?.animeList||[]).forEach(a=>{
    grid.appendChild(createAnimeCard(
      {title:a.title||"-",poster:a.poster||"",slug:a.animeId||""},
      {rating:a.score?String(a.score):"N/A",meta:a.status||""}
    ));
  });

  if(page>=last) setEnd(1);
  loading=false; setLoading(0);
}

document.addEventListener("DOMContentLoaded",()=>{
  loadMovieList(1);
  if(!main) return;
  main.addEventListener("scroll",()=>{
    const near=main.scrollTop+main.clientHeight>=main.scrollHeight-200;
    if(near&&!loading&&page<last) loadMovieList(page+1,1);
  },{passive:true});
});
