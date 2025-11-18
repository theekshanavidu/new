// app.js (module) - simple client-side auth simulation + dashboard
// No server / firebase. Data stored in localStorage for demo purposes.
// Import Chart.js is via CDN in HTML, so Chart is globally available.

const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');

const btnToSignup = document.getElementById('btn-to-signup');
const btnToLogin = document.getElementById('btn-to-login');
const cardModeTitle = document.getElementById('card-mode');
const submitBtn = document.getElementById('submit-btn');
const formMsg = document.getElementById('form-msg');

const signupOnlyFields = document.querySelectorAll('.signup-only');

let mode = 'signup'; // 'signup' or 'login'

// --- Mode switching ---
btnToSignup.addEventListener('click', ()=>setMode('signup'));
btnToLogin.addEventListener('click', ()=>setMode('login'));

function setMode(m){
  mode = m;
  if(mode==='signup'){
    btnToSignup.classList.add('active');
    btnToLogin.classList.remove('active');
    cardModeTitle.textContent = 'Sign Up';
    submitBtn.textContent = 'Sign up';
    signupOnlyFields.forEach(el=>el.style.display='block');
  }else{
    btnToSignup.classList.remove('active');
    btnToLogin.classList.add('active');
    cardModeTitle.textContent = 'Login';
    submitBtn.textContent = 'Login';
    signupOnlyFields.forEach(el=>el.style.display='none');
  }
}

// init
setMode('signup');

// --- Simple "Auth" using localStorage ---
// Users saved under key "neon_users" as { email: {fullname, password, logs:[] } }

function loadUsers(){
  const raw = localStorage.getItem('neon_users');
  return raw ? JSON.parse(raw) : {};
}
function saveUsers(obj){
  localStorage.setItem('neon_users', JSON.stringify(obj));
}
function setCurrentUser(email){
  localStorage.setItem('neon_current', email);
}
function getCurrentUser(){
  return localStorage.getItem('neon_current');
}
function clearCurrentUser(){
  localStorage.removeItem('neon_current');
}

// --- Auth form submit ---
const authForm = document.getElementById('auth-form');
authForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  formMsg.textContent = '';
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value.trim();
  const fullnameEl = document.getElementById('fullname');
  const fullname = fullnameEl ? fullnameEl.value.trim() : '';

  if(!email || !password){
    formMsg.textContent = 'Please fill required fields.';
    return;
  }

  const users = loadUsers();

  if(mode==='signup'){
    if(users[email]){
      formMsg.textContent = 'This email is already registered. Try login.';
      return;
    }
    // create user
    users[email] = { fullname: fullname || email.split('@')[0], password, logs: [] };
    saveUsers(users);
    setCurrentUser(email);
    showDashboard();
  }else{
    // login
    if(!users[email] || users[email].password !== password){
      formMsg.textContent = 'Invalid email or password.';
      return;
    }
    setCurrentUser(email);
    showDashboard();
  }
});

// --- Dashboard logic ---
const dashUsername = document.getElementById('dash-username');
const btnLogout = document.getElementById('btn-logout');

btnLogout.addEventListener('click', ()=>{
  clearCurrentUser();
  hideDashboard();
});

// Quick log form
const logForm = document.getElementById('log-form');
const logDate = document.getElementById('log-date');
const logHours = document.getElementById('log-hours');
const logMsg = document.getElementById('log-msg');

// default date = today
logDate.value = new Date().toISOString().slice(0,10);

logForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  logMsg.textContent = '';
  const d = logDate.value;
  const h = parseFloat(logHours.value);
  if(!d || isNaN(h) || h < 0){
    logMsg.textContent = 'Enter valid date and hours.';
    return;
  }
  const users = loadUsers();
  const email = getCurrentUser();
  if(!email || !users[email]){ logMsg.textContent = 'User not found.'; return; }
  users[email].logs.push({ date: d, hours: h });
  saveUsers(users);
  logMsg.textContent = 'Saved ✓';
  setTimeout(()=> logMsg.textContent = '', 1500);
  updateStatsAndChart();
});

// Chart variables
let weeklyChart = null;

// Show / hide dashboard
function showDashboard(){
  const email = getCurrentUser();
  if(!email) return;
  const users = loadUsers();
  const me = users[email];
  if(!me) return;
  // switch screens
  authScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  dashUsername.textContent = me.fullname || email.split('@')[0];
  // init stats & chart
  updateStatsAndChart();
}

function hideDashboard(){
  dashboardScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  // clear form messages and fields
  formMsg.textContent = '';
  document.getElementById('password').value = '';
  document.getElementById('email').value = '';
  if(document.getElementById('fullname')) document.getElementById('fullname').value = '';
}

// compute stats & render chart
function updateStatsAndChart(){
  const email = getCurrentUser();
  if(!email) return;
  const users = loadUsers();
  const me = users[email];
  const logs = (me.logs || []).slice(); // array of {date, hours}

  // compute totals
  const totalHours = logs.reduce((s,i)=>s+i.hours,0);
  const days = new Set(logs.map(l=>l.date)).size;
  const avg = days ? (totalHours/days).toFixed(2) : 0;

  document.getElementById('stat-hours').textContent = totalHours;
  document.getElementById('stat-days').textContent = days;
  document.getElementById('stat-average').textContent = avg;

  // weekly data: last 7 days labels and values
  const today = new Date();
  const labels = [];
  const data = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(today.getDate()-i);
    const iso = d.toISOString().slice(0,10);
    labels.push(iso.slice(5)); // MM-DD
    const sum = logs.filter(x=>x.date===iso).reduce((s,x)=>s+x.hours,0);
    data.push(sum);
  }

  // render Chart.js line
  const ctx = document.getElementById('chart-weekly').getContext('2d');
  if(weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Hours',
        data,
        tension: 0.35,
        borderColor: '#06c7c7',
        backgroundColor: 'rgba(6,199,199,0.12)',
        fill: true,
        pointRadius:4,
        pointBackgroundColor:'#08bdbd'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display:false },
        tooltip: { mode:'index', intersect:false }
      },
      scales: {
        x: { ticks: { color: '#cfe' } },
        y: { beginAtZero:true, ticks: { color: '#cfe' } }
      }
    }
  });
}

// on load, if already logged in -> show dashboard
if(getCurrentUser()){
  showDashboard();
}
