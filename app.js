import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut, updatePassword, updateEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import Chart from 'https://cdn.jsdelivr.net/npm/chart.js';

const firebaseConfig = {/* your config */};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID="m1rddMA36WbVunFW3B0BzuqOwyI2";
let currentUser=null;
const root=document.getElementById("root");

document.addEventListener("DOMContentLoaded", renderLanding);

onAuthStateChanged(auth,user=>{
    currentUser=user;
    if(user) user.uid===ADMIN_UID?renderAdminDashboard():renderDashboard();
});

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

/* ---------------- LANDING ---------------- */
function renderLanding(){
    root.innerHTML="";
    const frame=el("div",{cls:"app-frame"});
    const panel=el("div",{cls:"split-container"});

    const left=el("div",{cls:"panel left"},[
        el("h2",{},"WELCOME BACK!"),
        el("p",{},"Login or Sign up to continue.")
    ]);

    const right=el("div",{cls:"panel right"});
    const login=el("form",{id:"login-form"});
    login.append(
        el("div",{cls:"form-field"},[el("label",{},"Email"), el("input",{name:"email",type:"email",required:true})]),
        el("div",{cls:"form-field"},[el("label",{},"Password"), el("input",{name:"password",type:"password",required:true})]),
        el("button",{cls:"neon-btn",type:"submit"},"Login"),
        el("div",{cls:"small-link",html:`No account? <a href="#" id="go-sign">Sign up</a>`})
    );

    const signup=el("form",{id:"signup-form",style:"display:none"});
    signup.append(
        el("div",{cls:"form-field"},[el("label",{},"First Name"), el("input",{name:"firstName",required:true})]),
        el("div",{cls:"form-field"},[el("label",{},"Last Name"), el("input",{name:"lastName",required:true})]),
        el("div",{cls:"form-field"},[el("label",{},"Email"), el("input",{name:"email",type:"email",required:true})]),
        el("div",{cls:"form-field"},[el("label",{},"Password"), el("input",{name:"password",type:"password",required:true})]),
        el("button",{cls:"neon-btn",type:"submit"},"Sign Up"),
        el("div",{cls:"small-link",html:`Have an account? <a href="#" id="go-login">Login</a>`})
    );

    right.append(login,signup);
    panel.append(left,right);
    frame.append(panel);
    root.append(frame);

    document.getElementById("go-sign").onclick=e=>{e.preventDefault(); login.style.display="none"; signup.style.display="block";}
    document.getElementById("go-login").onclick=e=>{e.preventDefault(); login.style.display="block"; signup.style.display="none";}

    login.onsubmit=async e=>{
        e.preventDefault();
        const f=e.target;
        try{ await signInWithEmailAndPassword(auth,f.email.value,f.password.value); } 
        catch(err){ alert(err.message); }
    }

    signup.onsubmit=async e=>{
        e.preventDefault();
        const f=e.target;
        try{
            const cred=await createUserWithEmailAndPassword(auth,f.email.value,f.password.value);
            await updateProfile(cred.user,{displayName:f.firstName.value+" "+f.lastName.value});
            await setDoc(doc(db,"users",cred.user.uid),{
                firstName:f.firstName.value,
                lastName:f.lastName.value,
                email:f.email.value,
                createdAt:new Date().toISOString()
            });
        }catch(err){ alert(err.message); }
    }
}

/* ---------------- DASHBOARD ---------------- */
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
    const weeklyCanvas=el("canvas",{id:"weeklyChart"});
    const monthlyCanvas=el("canvas",{id:"monthlyChart"});
    dash.append(dateInput,hoursInput,addBtn,weeklyCanvas,monthlyCanvas);
    frame.append(dash);
    root.append(frame);

    btnLogout.onclick=async()=>{ await signOut(auth); renderLanding(); }
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

/* ---------------- PROFILE ---------------- */
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
    btnLogout.onclick=async()=>{ await signOut(auth); renderLanding(); }

    saveBtn.onclick=async()=>{
        const updated={firstName:firstName.value,lastName:lastName.value};
        if(pwInput.value) updated.password=pwInput.value;
        try{
            await updateDoc(doc(db,"users",currentUser.uid),updated);
            if(pwInput.value) await updatePassword(currentUser,pwInput.value);
            if(emailInput.value!==userData.email){
                await updateEmail(currentUser,emailInput.value);
                await sendEmailVerification(currentUser);
                alert("Email changed! Verification sent.");
            }
            alert("Profile updated!"); renderDashboard();
        }catch(err){ alert(err.message); }
    }
}

/* ---------------- ADMIN DASHBOARD ---------------- */
async function renderAdminDashboard(){
    root.innerHTML="";
    const frame=el("div",{cls:"app-frame"});
    const top=el("div",{cls:"topbar"});
    const brand=el("div",{cls:"brand"},"Admin Dashboard");
    const btnLogout=el("button",{cls:"neon-btn"},"Logout");
    top.append(brand,btnLogout);
    frame.append(top);

    const dash=el("div",{cls:"dashboard"});
    frame.append(dash);
    root.append(frame);

    btnLogout.onclick=async()=>{ await signOut(auth); renderLanding(); }

    const usersSnap=await getDocs(collection(db,"users"));
    for(const u of usersSnap.docs){
        const udata=u.data();
        const card=el("div",{cls:"card"},[
            el("div",{},`${udata.firstName} ${udata.lastName} (${udata.email})`),
            el("button",{cls:"neon-btn"},"Delete"),
            el("button",{cls:"neon-btn"},"View Charts")
        ]);
        dash.append(card);

        card.querySelectorAll("button")[0].onclick=async()=>{
            if(confirm("Delete this user?")){ await deleteDoc(doc(db,"users",u.id)); renderAdminDashboard(); }
        }

        card.querySelectorAll("button")[1].onclick=async()=>{
            root.innerHTML="";
            const frame2=el("div",{cls:"app-frame"});
            const backBtn=el("button",{cls:"neon-btn"},"Back");
            frame2.append(backBtn);
            const canvasWeekly=el("canvas"); const canvasMonthly=el("canvas");
            frame2.append(canvasWeekly,canvasMonthly);
            root.append(frame2);

            backBtn.onclick=()=>renderAdminDashboard();

            const logsSnap=await getDocs(query(collection(db,"studyLogs"),where("userId","==",u.id)));
            const logs=logsSnap.docs.map(d=>d.data());

            // Weekly Chart
            const today=new Date();
            const weekDates=[];
            for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); weekDates.push(d.toISOString().split("T")[0]); }
            const weeklyData=weekDates.map(d=>{ const l=logs.find(l=>l.date===d); return l?l.hours:0; });
            new Chart(canvasWeekly,{type:"line",data:{labels:weekDates,datasets:[{label:"Hours",data:weeklyData,borderColor:"#00f0ef",backgroundColor:"#8b5cf6"}]} });

            // Monthly Chart
            const monthLabels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const monthlyData=Array(12).fill(0);
            logs.forEach(l=>{ const m=new Date(l.date).getMonth(); monthlyData[m]+=l.hours; });
            new Chart(canvasMonthly,{type:"line",data:{labels:monthLabels,datasets:[{label:"Hours",data:monthlyData,borderColor:"#00f0ef",backgroundColor:"#8b5cf6"}]} });
        }
    }
}
