const grid=document.getElementById("myListGrid"),empty=document.getElementById("myListEmpty");

const renderMyListPage=()=>{
  if(!grid||!empty) return;
  const favs=getFavorites(); grid.innerHTML="";
  empty.style.display=favs.length?"none":"block";
  favs.forEach(a=>grid.appendChild(createAnimeCard(a,{
    rating:a.rating||"",
    badgeBottom:a.episode_count?`${a.episode_count} Eps`:"",
    meta:a.status||""
  })));
};

document.addEventListener("DOMContentLoaded",renderMyListPage);
