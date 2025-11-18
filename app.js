// simple UI behavior: toggle forms, fake submit handlers
document.addEventListener('DOMContentLoaded', ()=>{

  const signupForm = document.getElementById('signup-form');
  const loginForm  = document.getElementById('login-form');
  const toLogin = document.getElementById('to-login');
  const toSignup = document.getElementById('to-signup');
  const modeTitle = document.getElementById('mode-title');
  const forgot = document.getElementById('forgot-pass');

  function showLogin(){
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    modeTitle.textContent = 'login';
  }
  function showSignup(){
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    modeTitle.textContent = 'sign Up';
  }

  toLogin.addEventListener('click', (e)=>{ e.preventDefault(); showLogin(); });
  toSignup.addEventListener('click', (e)=>{ e.preventDefault(); showSignup(); });

  forgot.addEventListener('click', (e)=>{ e.preventDefault(); const em = prompt('Enter email to reset password:'); if(em) alert('If that email exists, a reset link would be sent (demo).'); });

  signupForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = new FormData(signupForm);
    const username = data.get('username') || '';
    const email = data.get('email') || '';
    alert(`(Demo) Signed up: ${username} — ${email}`);
    signupForm.reset();
    showLogin();
  });

  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = new FormData(loginForm);
    const email = data.get('email');
    alert(`(Demo) Logged in as ${email}`);
    loginForm.reset();
  });

});
