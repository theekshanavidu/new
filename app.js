import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, updatePassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, addDoc, collection, query, where, getDocs, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------------- FIREBASE ----------------
const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "m1rddMA36WbVunFW3B0BzuqOwyI2";
let currentUser = null;

function el(tag, attrs={}, children=[]){
    const e=document.createElement(tag);
    for(const k in attrs){
        if(k==="cls") e.className=attrs[k];
        else if(k==="html") e.innerHTML=attrs[k];
        else e.setAttribute(k, attrs[k]);
    }
    if(typeof children==="string") e.textContent=children;
    else children.forEach(c => e.appendChild(typeof c==="string"?document.createTextNode(c):c));
    return e;
}

const root = document.getElementById("root");

// ---------------- AUTH ----------------
document.addEventListener("DOMContentLoaded", renderLanding);

onAuthStateChanged(auth, user=>{
    currentUser = user;
    if(user) renderDashboard();
});

// ---------------- LANDING ----------------
function renderLanding(){
    if(!root) return;
    root.innerHTML="";

    const frame = el("div",{cls:"app-frame"});
    const top = el("div",{cls:"topbar"},[ el("div",{cls:"brand"},"StudyTracker") ]);
    frame.appendChild(top);

    const panel = el("div",{cls:"split-container panel"});
    const left = el("div",{cls:"left"},[
        el("h2",{},["WELCOME BACK!"]),
        el("p",{},["Login or sign up to continue."])
    ]);
    const right = el("div",{cls:"right"});

    // Login Form
    const login = el("form",{id:"login-form"});
    login.append(
        el("div",{cls:"form-field"},[el("label",{},["Email"]), el("input",{name:"email",type:"email",required:true})]),
        el("div",{cls:"form-field"},[el("label",{},["Password"]), el("input",{name:"password",type:"password",required:true})]),
        el("button",{cls:"neon-btn",type:"submit"},"Login"),
        el("div",{cls:"small-link",html:`No account? <a href="#" id="go-sign">Sign up</a>`})
    );

    // Signup Form
    const signup = el("form",{id:"signup-form",style:"display:none"});
    signup.append(
        el("div",{cls:"form-field"},[ el("label",{},["First Name"]), el("input",{name:"firstName",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["Last Name"]), el("input",{name:"lastName",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["Birthday"]), el("input",{name:"birthday",type:"date",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["School"]), el("input",{name:"school",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["Phone"]), el("input",{name:"phone",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["Exam Year"]), el("input",{name:"examYear",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["Email"]), el("input",{name:"email",type:"email",required:true}) ]),
        el("div",{cls:"form-field"},[ el("label",{},["Password"]), el("input",{name:"password",type:"password",required:true}) ]),
        el("button",{cls:"neon-btn",type:"submit"},"Sign Up"),
        el("div",{cls:"small-link",html:`Have an account? <a href="#" id="go-login">Login</a>`})
    );

    right.append(login, signup);
    panel.append(left, right);
    frame.append(panel);
    root.append(frame);

    // SWITCH
    document.getElementById("go-sign").onclick=e=>{e.preventDefault(); signup.style.display="block"; login.style.display="none";}
    document.getElementById("go-login").onclick=e=>{e.preventDefault(); signup.style.display="none"; login.style.display="block";}

    // LOGIN
    login.onsubmit = async e=>{
        e.preventDefault();
        const f = e.target;
        try{ await signInWithEmailAndPassword(auth,f.email.value,f.password.value); } 
        catch(err){ alert(err.message); }
    };

    // SIGNUP
    signup.onsubmit = async e=>{
        e.preventDefault();
        const f = e.target;
        try{
            const cred = await createUserWithEmailAndPassword(auth,f.email.value,f.password.value);
            await updateProfile(cred.user,{displayName:f.firstName.value+" "+f.lastName.value});
            await setDoc(doc(db,"users",cred.user.uid),{
                firstName:f.firstName.value,lastName:f.lastName.value,
                birthday:f.birthday.value,school:f.school.value,
                phone:f.phone.value,examYear:f.examYear.value,
                email:f.email.value,createdAt:new Date().toISOString()
            });
        }catch(err){ alert(err.message);}
    };
}

// ---------------- DASHBOARD ----------------
function renderDashboard(){
    root.innerHTML = "";

    const frame = el("div",{cls:"app-frame"});
    const top = el("div",{cls:"topbar"});
    const brand = el("div",{cls:"brand"},"StudyTracker");
    const btnProfile = el("button",{cls:"neon-btn"},"Profile");
    const btnLogout = el("button",{cls:"neon-btn"},"Logout");
    top.append(brand, btnProfile, btnLogout);
    frame.append(top);

    const dashboard = el("div",{cls:"dashboard"});
    const dateTime = el("div",{cls:"card"});
    dashboard.append(dateTime);

    // Realtime Date & Time
    function updateDateTime(){
        const now = new Date();
        dateTime.textContent = now.toLocaleString();
    }
    setInterval(updateDateTime,1000);
    updateDateTime();

    frame.append(dashboard);
    root.append(frame);

    btnLogout.onclick = async ()=>{
        await signOut(auth);
        renderLanding();
    };

    btnProfile.onclick = ()=>{
        renderProfile();
    };
}

// ---------------- PROFILE ----------------
async function renderProfile(){
    if(!currentUser) return;
    root.innerHTML="";

    const docSnap = await getDoc(doc(db,"users",currentUser.uid));
    const userData = docSnap.exists()?docSnap.data():{};

    const frame = el("div",{cls:"app-frame"});
    const top = el("div",{cls:"topbar"});
    const brand = el("div",{cls:"brand"},"Profile");
    const btnBack = el("button",{cls:"neon-btn"},"Back");
    top.append(brand,btnBack);
    frame.append(top);

    const container = el("div",{cls:"dashboard"});
    container.append(
        el("div",{cls:"form-field"},[el("label",{},["First Name"]), el("input",{name:"firstName",value:userData.firstName||""})]),
        el("div",{cls:"form-field"},[el("label",{},["Last Name"]), el("input",{name:"lastName",value:userData.lastName||""})]),
        el("div",{cls:"form-field"},[el("label",{},["Birthday"]), el("input",{type:"date",name:"birthday",value:userData.birthday||""})]),
        el("div",{cls:"form-field"},[el("label",{},["School"]), el("input",{name:"school",value:userData.school||""})]),
        el("div",{cls:"form-field"},[el("label",{},["Phone"]), el("input",{name:"phone",value:userData.phone||""})]),
        el("div",{cls:"form-field"},[el("label",{},["Exam Year"]), el("input",{name:"examYear",value:userData.examYear||""})]),
        el("div",{cls:"form-field"},[el("label",{},["Email (readonly)"]), el("input",{name:"email",value:userData.email||"",readonly:true})]),
        el("div",{cls:"form-field"},[el("label",{},["Password"]), el("input",{type:"password",name:"password",placeholder:"Leave empty if not changing"})])
    );

    const btnSave = el("button",{cls:"neon-btn"},"Save Changes");
    container.append(btnSave);
    frame.append(container);
    root.append(frame);

    btnBack.onclick = ()=>renderDashboard();

    btnSave.onclick = async ()=>{
        const inputs = container.querySelectorAll("input");
        const updated = {};
        inputs.forEach(inp=>{ if(inp.name!=="email" && inp.value) updated[inp.name]=inp.value; });
        try{
            await updateDoc(doc(db,"users",currentUser.uid),updated);
            if(updated.password) await updatePassword(currentUser,updated.password);
            alert("Profile updated!");
            renderDashboard();
        }catch(err){ alert(err.message);}
    };
}
