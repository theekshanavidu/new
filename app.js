import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, updateProfile, updatePassword, signOut, updateEmail, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------------- FIREBASE ----------------
const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "m1rddMA36WbVunFW3B0BzuqOwyI2";
let currentUser=null;
const root=document.getElementById("root");

// ---------------- HELPER ----------------
function el(tag,attrs={},children=[]){
  const e=document.createElement(tag);
  for(const k in attrs){
    if(k==="cls") e.className=attrs[k];
    else if(k==="html") e.innerHTML=attrs[k];
    else e.setAttribute(k,attrs[k]);
  }
  if(typeof children==="string") e.textContent=children;
  else children.forEach(c=>e.appendChild(typeof c==="string"?document.createTextNode(c):c));
  return e;
}

// ---------------- AUTH STATE ----------------
document.addEventListener("DOMContentLoaded", renderLanding);

onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(user) user.uid===ADMIN_UID?renderAdminDashboard():renderDashboard();
});

// ---------------- LANDING ----------------
function renderLanding(){
  root.innerHTML="";
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"},[el("div",{cls:"brand"},"StudyTracker")]);
  frame.appendChild(top);

  const login=el("form",{id:"login-form"});
  login.append(
    el("div",{cls:"form-field"},[el("label",{},["Email"]),el("input",{name:"email",type:"email",required:true})]),
    el("div",{cls:"form-field"},[el("label",{},["Password"]),el("input",{name:"password",type:"password",required:true})]),
    el("button",{cls:"neon-btn",type:"submit"},"Login"),
    el("div",{cls:"small-link",html:`No account? <a id="go-sign">Sign up</a>`})
  );

  const signup=el("form",{id:"signup-form",style:"display:none"});
  signup.append(
    el("div",{cls:"form-field"},[el("label",{},["First Name"]),el("input",{name:"firstName",required:true})]),
    el("div",{cls:"form-field"},[el("label",{},["Last Name"]),el("input",{name:"lastName",required:true})]),
    el("div",{cls:"form-field"},[el("label",{},["Email"]),el("input",{name:"email",type:"email",required:true})]),
    el("div",{cls:"form-field"},[el("label",{},["Password"]),el("input",{name:"password",type:"password",required:true})]),
    el("button",{cls:"neon-btn",type:"submit"},"Sign Up"),
    el("div",{cls:"small-link",html:`Have an account? <a id="go-login">Login</a>`})
  );

  frame.append(login,signup);
  root.append(frame);

  document.getElementById("go-sign").onclick=e=>{e.preventDefault(); login.style.display="none"; signup.style.display="block";}
  document.getElementById("go-login").onclick=e=>{e.preventDefault(); login.style.display="block"; signup.style.display="none";}

  login.onsubmit=async e=>{
    e.preventDefault(); const f=e.target;
    try{ await signInWithEmailAndPassword(auth,f.email.value,f.password.value);}
    catch(err){alert(err.message);}
  }

  signup.onsubmit=async e=>{
    e.preventDefault(); const f=e.target;
    try{
      const cred=await createUserWithEmailAndPassword(auth,f.email.value,f.password.value);
      await updateProfile(cred.user,{displayName:f.firstName.value+" "+f.lastName.value});
      await setDoc(doc(db,"users",cred.user.uid),{
        firstName:f.firstName.value,
        lastName:f.lastName.value,
        email:f.email.value,
        createdAt:new Date().toISOString()
      });
      await sendEmailVerification(cred.user);
      alert("Signup success! Verification email sent.");
    }catch(err){alert(err.message);}
  }
}

// ---------------- USER DASHBOARD ----------------
async function renderDashboard(){
  root.innerHTML="";
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"});
  const brand=el("div",{cls:"brand"},"StudyTracker");
  const btnProfile=el("button",{cls:"neon-btn"},"Profile");
  const btnLogout=el("button",{cls:"neon-btn"},"Logout");
  const btnToggle=el("button",{cls:"neon-btn"},"Light/Dark Mode");
  top.append(brand,btnProfile,btnLogout,btnToggle);
  frame.append(top);

  const dash=el("div",{cls:"dashboard"});
  const dateInput=el("input",{type:"date",cls:"form-field",id:"study-date"});
  const hoursInput=el("input",{type:"number",cls:"form-field",placeholder:"Hours (0-24)",min:0,max:24,step:0.1});
  const addBtn=el("button",{cls:"neon-btn"},"Add / Update");
  const weeklyCanvas=el("canvas",{id:"weeklyChart",width:400,height:200});
  const monthlyCanvas=el("canvas",{id:"monthlyChart",width:400,height:200});
  dash.append(dateInput,hoursInput,addBtn,weeklyCanvas,monthlyCanvas);
  frame.append(dash);
  root.append(frame);

  btnLogout.onclick=async()=>{await signOut(auth);renderLanding();}
  btnProfile.onclick=()=>renderProfile();
  btnToggle.onclick=()=>document.body.classList.toggle("light-mode");

  addBtn.onclick=async()=>{
    const date=dateInput.value; let hours=parseFloat(hoursInput.value);
    if(!date) return alert("Select a date"); if(hours<0) hours=0; if(hours>24) hours=24;
    await setDoc(doc(db,"studyLogs",currentUser.uid+"_"+date),{userId:currentUser.uid,date,hours,createdAt:new Date().toISOString()});
    alert("Saved!"); renderDashboard();
  }

  const logsSnap=await getDocs(query(collection(db,"studyLogs"),where("userId","==",currentUser.uid)));
  const logs=logsSnap.docs.map(d=>d.data());

  // Weekly Chart
  const today=new Date();
  const weekDates=[];
  for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); weekDates.push(d.toISOString().split("T")[0]); }
  const weeklyData=weekDates.map(d=>{ const l=logs.find(l=>l.date===d); return l?l.hours:0; });
  new Chart(weeklyCanvas,{type:"line",data:{labels:weekDates,datasets:[{label:"Hours",data:weeklyData,borderColor:"#00f0ef",backgroundColor:"#8b5cf6"}]} });

  // Monthly Chart
  const monthLabels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyData=Array(12).fill(0);
  logs.forEach(l=>{ const m=new Date(l.date).getMonth(); monthlyData[m]+=l.hours; });
  new Chart(monthlyCanvas,{type:"line",data:{labels:monthLabels,datasets:[{label:"Hours",data:monthlyData,borderColor:"#00f0ef",backgroundColor:"#8b5cf6"}]} });
}

// ---------------- PROFILE ----------------
async function renderProfile(){
  if(!currentUser) return;
  root.innerHTML="";
  const docSnap=await getDoc(doc(db,"users",currentUser.uid));
  const userData=docSnap.exists()?docSnap.data():{};
  const frame=el("div",{cls:"app-frame"});
  const top=el("div",{cls:"topbar"});
  const brand=el("div",{cls:"brand"},"Profile");
  const btnBack=el("button",{cls:"neon-btn"},"Back");
  const btnLogout=el("button",{cls:"neon-btn"},"Logout");
  top.append(brand,btnBack,btnLogout);
  frame.append(top);

  const container=el("div",{cls:"dashboard"});
  const firstName=el("input",{cls:"form-field",value:userData.firstName||"",placeholder:"First Name"});
  const lastName=el("input",{cls:"form-field",value:userData.lastName||"",placeholder:"Last Name"});
  const emailInput=el("input",{cls:"form-field",value:userData.email||"",placeholder:"Email"});
  const pwInput=el("input",{cls:"form-field",type:"password",placeholder:"New Password"});
  const saveBtn=el("button",{cls:"neon-btn"},"Save Changes");
  container.append(firstName,lastName,emailInput,pwInput,saveBtn);
  frame.append(container);
  root.append(frame);

  btnBack.onclick=()=>renderDashboard();
  btnLogout.onclick=async()=>{await signOut(auth);renderLanding();}

  saveBtn.onclick=async()=>{
    const updated={firstName:firstName.value,lastName:lastName.value};
    try{
      await updateDoc(doc(db,"users",currentUser.uid),updated);
      if(pwInput.value){
        try{ await updatePassword(currentUser,pwInput.value); } catch(err){alert("Password update failed: "+err.message);}
      }
      if(emailInput.value!==userData.email){
        try{
          await updateEmail(currentUser,emailInput.value);
          await sendEmailVerification(currentUser);
          alert("Email changed! Verification sent.");
        } catch(err){alert("Email update failed: "+err.message);}
      }
      alert("Profile updated!"); renderDashboard();
    } catch(err){alert(err.message);}
  }
}
