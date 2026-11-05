/* Mashup Match campaign content. Rules and rewards are separate from player data.
 * Rewards here are defaults only; the server's administrator configuration wins.
 */
export const MATCH_WORLDS = Object.freeze([
  {id:1,name:'Jardins du seuil',subtitle:'Les premières résonances du Codex',color:'#66d7ac',icon:'✦',mechanics:['match3']},
  {id:2,name:'Ateliers prismatiques',subtitle:'Lumières en ligne et premiers bonus',color:'#66c8ee',icon:'◇',mechanics:['directional','prism']},
  {id:3,name:'Ruines de cuivre',subtitle:'Libère les reliques sous leurs sceaux',color:'#dcaa78',icon:'⬡',mechanics:['obstacles']},
  {id:4,name:'Forêt des échos',subtitle:'Deux couleurs, une même harmonie',color:'#8abf83',icon:'❖',mechanics:['double-collection','zone']},
  {id:5,name:'Archipels célestes',subtitle:'Des îles reliées par la lumière',color:'#8eaff2',icon:'✧',mechanics:['shaped-board']},
  {id:6,name:'Forge du crépuscule',subtitle:'Les sceaux résistent à la première onde',color:'#e48c78',icon:'◈',mechanics:['armored-obstacles']},
  {id:7,name:'Observatoire azur',subtitle:'Anticipe la prochaine cascade',color:'#62c7d6',icon:'✺',mechanics:['mixed-objectives']},
  {id:8,name:'Palais des mirages',subtitle:'Chaque mouvement dessine un chemin',color:'#c295ec',icon:'⌘',mechanics:['combined-bonuses']},
  {id:9,name:'Noyau d’obsidienne',subtitle:'La maîtrise au cœur du métal noir',color:'#dc92b4',icon:'✵',mechanics:['layered-terrain']},
  {id:10,name:'Couronne du multivers',subtitle:'Réunis les derniers éclats du Codex',color:'#f0d486',icon:'♛',mechanics:['mastery']}
].map(world=>Object.freeze({...world,mechanics:Object.freeze(world.mechanics)})));
export const MATCH_DEFAULT_REWARDS = Object.freeze([20,35,50,75,100,150,200,275,350,500]);
const layouts=['square','cut-corners','wide','hourglass','cross','ring','bridges','diamond'];
// Each world has ten explicit encounter profiles: layout, objective, budget,
// score target, colour quota, obstacle count and armour. Budgets are not the
// difficulty mechanism: later worlds combine terrain, collection and armour.
const ENCOUNTERS = [
 [['square','score',26,900,0,0,0],['wide','collect',27,0,7,0,0],['square','score',26,1200,0,0,0],['cut-corners','collect',27,0,9,0,0],['wide','mixed',28,1000,7,0,0],['square','score',26,1600,0,0,0],['cut-corners','collect',28,0,11,0,0],['wide','double',28,0,7,0,0],['square','mixed',28,1600,9,0,0],['cut-corners','score',28,2200,0,0,0]],
 [['wide','score',27,2000,0,0,0],['square','double',28,0,10,0,0],['cut-corners','mixed',28,1800,12,0,0],['wide','collect',27,0,16,0,0],['square','score',27,2600,0,0,0],['wide','double',29,0,12,0,0],['cut-corners','mixed',28,2400,12,0,0],['square','collect',28,0,19,0,0],['wide','score',27,3200,0,0,0],['cut-corners','double',29,1800,14,0,0]],
 [['square','obstacles',28,0,0,4,1],['wide','mixed',29,2200,10,4,1],['cut-corners','obstacles',28,0,0,5,1],['square','collect',29,0,16,5,1],['wide','obstacles',28,1800,0,6,1],['cut-corners','double',29,0,12,5,1],['square','mixed',29,2600,14,6,1],['wide','obstacles',29,0,0,7,1],['cut-corners','mixed',30,2800,15,6,1],['square','obstacles',30,3000,0,8,1]],
 [['cut-corners','double',30,0,15,5,1],['square','mixed',29,3000,16,6,1],['wide','double',30,2200,15,5,1],['hourglass','obstacles',31,0,0,5,1],['square','double',29,2600,17,6,1],['cut-corners','mixed',30,3200,18,6,1],['wide','obstacles',30,3000,0,8,1],['hourglass','double',31,0,16,4,1],['square','mixed',30,3400,20,7,1],['cut-corners','double',31,3200,18,6,1]],
 [['cross','collect',32,0,18,2,1],['diamond','double',32,0,16,3,1],['bridges','obstacles',32,2000,0,5,1],['ring','collect',33,0,19,2,1],['hourglass','mixed',32,3000,17,4,1],['cross','double',33,0,16,2,1],['diamond','mixed',32,3200,18,4,1],['bridges','obstacles',32,2800,0,6,1],['ring','double',34,0,17,3,1],['hourglass','mixed',33,3600,20,4,1]],
 [['square','obstacles',31,2200,0,5,2],['wide','mixed',31,3400,16,5,2],['cut-corners','obstacles',32,0,0,6,2],['hourglass','collect',33,0,23,4,2],['square','double',31,3000,18,5,2],['wide','obstacles',32,3200,0,6,2],['cut-corners','mixed',32,3800,20,5,2],['diamond','double',34,0,19,4,2],['wide','mixed',33,4000,23,6,2],['square','obstacles',33,4000,0,7,2]],
 [['diamond','double',33,3200,19,4,1],['wide','mixed',32,4200,24,6,2],['hourglass','double',34,2800,20,4,2],['bridges','mixed',34,3800,23,4,2],['square','obstacles',32,4200,0,8,2],['cross','double',35,0,20,3,1],['wide','mixed',33,4600,26,6,2],['ring','collect',35,0,28,3,2],['cut-corners','double',34,3800,23,5,2],['diamond','mixed',35,4400,25,5,2]],
 [['bridges','double',35,3200,22,5,2],['ring','mixed',36,3200,26,3,2],['hourglass','obstacles',35,3000,0,6,2],['square','double',33,4600,25,7,2],['diamond','mixed',35,4600,27,5,2],['wide','obstacles',34,4800,0,8,2],['cross','double',36,2000,22,3,2],['cut-corners','mixed',35,4800,29,6,2],['bridges','double',36,3800,25,5,2],['ring','mixed',36,3600,30,3,2]],
 [['square','mixed',34,5200,30,8,2],['diamond','double',36,4200,26,5,2],['bridges','obstacles',36,4200,0,7,2],['wide','double',34,5000,28,7,2],['ring','mixed',37,3800,32,3,2],['hourglass','double',36,4000,27,5,2],['cut-corners','mixed',35,5400,31,7,2],['cross','obstacles',37,2800,0,5,2],['diamond','double',37,4600,29,6,2],['wide','mixed',35,5800,34,8,2]],
 [['diamond','mixed',37,5000,33,6,2],['bridges','double',37,4600,30,6,2],['ring','obstacles',38,3600,0,5,2],['square','double',35,5800,32,8,2],['hourglass','mixed',38,4800,34,6,2],['cross','double',39,2600,27,4,2],['wide','mixed',36,6200,36,8,2],['cut-corners','obstacles',37,5000,0,8,2],['diamond','double',39,5000,32,6,2],['bridges','mixed',40,5800,38,7,2]]
];
function terrain(layout,width,height){
 const middleX=Math.floor(width/2),middleY=Math.floor(height/2);
 return Array.from({length:width*height},(_,index)=>{
  const x=index%width,y=Math.floor(index/width),edgeX=Math.min(x,width-1-x),edgeY=Math.min(y,height-1-y);
  if(layout==='cut-corners')return !(edgeX===0&&edgeY===0);
  if(layout==='diamond')return Math.abs(x-middleX)+Math.abs(y-middleY)<=middleX+1;
  if(layout==='cross')return Math.abs(x-middleX)<=1||Math.abs(y-middleY)<=1;
  if(layout==='hourglass')return Math.abs(x-middleX)<=Math.max(1,Math.abs(y-middleY));
  if(layout==='ring')return !(Math.abs(x-middleX)<=1&&Math.abs(y-middleY)<=1);
  if(layout==='bridges')return !(y===middleY&&x!==middleX&&x!==1&&x!==width-2);
  return true;
 });
}
function obstacleMap(mask,width,height,count,hp,levelId){
 const candidates=mask.flatMap((value,index)=>{
  if(!value)return [];
  const x=index%width,y=Math.floor(index/width);
  const nearby=[x?index-1:-1,x+1<width?index+1:-1,y?index-width:-1,y+1<height?index+width:-1].filter(at=>at>=0&&mask[at]);
  return nearby.length>=3?[index]:[];
 });
 candidates.sort((a,b)=>((a*37+levelId*13)%101)-((b*37+levelId*13)%101));
 const selected=[];
 for(const index of candidates){
  if(selected.length>=count)break;
  // Sufficient open room around each seal avoids inaccessible wall clusters.
  if(selected.some(at=>Math.abs(at%width-index%width)+Math.abs(Math.floor(at/width)-Math.floor(index/width))<2))continue;
  selected.push(index);
 }
 for(const index of candidates)if(selected.length<count&&!selected.includes(index))selected.push(index);
 return mask.map((_,index)=>selected.includes(index)?hp:0);
}
function buildLevel(profile,worldIndex,within){
 const id=worldIndex*10+within+1,[layout,kind,moves,score,quota,obstacleCount,armour]=profile;
 const width=layout==='wide'?8:7,height=layout==='wide'?6:7,colors=worldIndex<2?5:worldIndex>=7?6:5;
 const mask=terrain(layout,width,height),obstacles=obstacleMap(mask,width,height,obstacleCount,armour,id),collect=[0,0,0,0,0,0],targetKind=(id+worldIndex)%colors;
 if(['collect','mixed','double'].includes(kind))collect[targetKind]=quota;
 if(kind==='double')collect[(targetKind+2)%colors]=quota;
 const obstacleGoal=kind==='obstacles'?obstacleCount:worldIndex>=2&&kind==='mixed'?Math.max(1,Math.ceil(obstacleCount*.65)):0;
 const goals={score,collect,obstacles:obstacleGoal},base=score||1200+quota*50+obstacleCount*100;
 const names={score:'Résonance',collect:'Éclats',mixed:'Convergence',double:'Harmonie',obstacles:'Sceaux'};
 return {id,name:names[kind]+' '+String(within+1).padStart(2,'0'),worldId:worldIndex+1,world:worldIndex+1,width,height,colors,moves,seed:154000+id*7919,layout,objectiveType:kind,mask,obstacles,goals,starTargets:[base,Math.ceil(base*1.35),Math.ceil(base*1.8)],reward:MATCH_DEFAULT_REWARDS[worldIndex],mechanics:[...MATCH_WORLDS[worldIndex].mechanics]};
}
export const MATCH_LEVELS=Object.freeze(ENCOUNTERS.flatMap((profiles,world)=>profiles.map((profile,within)=>{
 const level=buildLevel(profile,world,within);
 return Object.freeze({...level,mask:Object.freeze(level.mask),obstacles:Object.freeze(level.obstacles),goals:Object.freeze({...level.goals,collect:Object.freeze(level.goals.collect)}),starTargets:Object.freeze(level.starTargets),mechanics:Object.freeze(level.mechanics)});
})));
export function getMatchLevel(id){return Number.isSafeInteger(Number(id))?MATCH_LEVELS.find(level=>level.id===Number(id))||null:null;}
export function validateMatchLevel(level){
 const errors=[];
 if(!level||!Number.isSafeInteger(level.id)||level.id<1)return ['invalid-id'];
 if(!Number.isSafeInteger(level.width)||!Number.isSafeInteger(level.height)||level.width<4||level.width>9||level.height<4||level.height>9)errors.push('invalid-size');
 if(!Number.isSafeInteger(level.moves)||level.moves<1||level.moves>100)errors.push('invalid-moves');
 if(!Number.isSafeInteger(level.colors)||level.colors<4||level.colors>6)errors.push('invalid-colors');
 const length=level.width*level.height;
 if(!Array.isArray(level.mask)||level.mask.length!==length||level.mask.some(value=>typeof value!=='boolean'))errors.push('invalid-mask');
 if(!Array.isArray(level.obstacles)||level.obstacles.length!==length||level.obstacles.some((hp,i)=>!Number.isSafeInteger(hp)||hp<0||hp>3||(!level.mask?.[i]&&hp)))errors.push('invalid-obstacles');
 const goals=level.goals;
 if(!goals||!Number.isSafeInteger(goals.score)||goals.score<0||!Number.isSafeInteger(goals.obstacles)||goals.obstacles<0||!Array.isArray(goals.collect)||goals.collect.length!==6||goals.collect.some((n,i)=>!Number.isSafeInteger(n)||n<0||(i>=level.colors&&n)))errors.push('invalid-goals');
 else if(!goals.score&&!goals.obstacles&&!goals.collect.some(Boolean))errors.push('empty-goals');
 if(goals?.obstacles>level.obstacles?.filter(Boolean).length)errors.push('unreachable-obstacles');
 if(!MATCH_WORLDS.some(world=>world.id===level.worldId))errors.push('invalid-world');
 if(!Array.isArray(level.starTargets)||level.starTargets.length!==3||level.starTargets.some((n,i,a)=>!Number.isSafeInteger(n)||n<1||(i&&n<=a[i-1])))errors.push('invalid-stars');
 return errors;
}
