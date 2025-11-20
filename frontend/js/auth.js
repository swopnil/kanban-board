let currentUser = null;

const auth = {
    init: async () => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await api.getUser();
                currentUser = response.user;
                showApp();
            } catch (error) {
                logout();
            }
        } else {
            showSignIn();
        }
    },

    signin: async (email, password) => {
        const response = await api.signin({ email, password });
        localStorage.setItem('authToken', response.token);
        currentUser = response.user;
        showApp();
    },

    signup: async (name, email, password) => {
        const response = await api.signup({ name, email, password });
        localStorage.setItem('authToken', response.token);
        currentUser = response.user;
        showApp();
    }
};

const showWelcome = () => {
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('app').style.display = 'none';
};

const showApp = () => {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.name;
    
    // Show dashboard by default
    if (typeof showDashboard === 'function') {
        showDashboard();
    }
};

const logout = () => {
    localStorage.removeItem('authToken');
    currentUser = null;
    showSignIn();
};

const showSignIn = () => {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('app').style.display = 'none';
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('authModal').classList.add('show');
};

const openAuthModal = (mode = 'signin') => {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const nameGroup = document.getElementById('nameGroup');
    const roleGroup = document.getElementById('roleGroup');
    const switchText = document.getElementById('authSwitchText');
    
    if (mode === 'signup') {
        title.textContent = 'Sign Up for KanbanFlow';
        submitBtn.textContent = 'Sign Up';
        nameGroup.style.display = 'block';
        roleGroup.style.display = 'block';
        switchText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Sign in</a>';
    } else {
        title.textContent = 'Sign In to KanbanFlow';
        submitBtn.textContent = 'Sign In';
        nameGroup.style.display = 'none';
        roleGroup.style.display = 'none';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign up</a>';
    }
    
    modal.style.display = 'block';
    modal.classList.add('show');
};

const closeAuthModal = () => {
    const modal = document.getElementById('authModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('authForm').reset();
};

const toggleAuthMode = () => {
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const nameGroup = document.getElementById('nameGroup');
    const roleGroup = document.getElementById('roleGroup');
    const switchText = document.getElementById('authSwitchText');
    
    if (title.textContent.includes('Sign In')) {
        title.textContent = 'Sign Up for KanbanFlow';
        submitBtn.textContent = 'Sign Up';
        nameGroup.style.display = 'block';
        roleGroup.style.display = 'block';
        switchText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Sign in</a>';
    } else {
        title.textContent = 'Sign In to KanbanFlow';
        submitBtn.textContent = 'Sign In';
        nameGroup.style.display = 'none';
        roleGroup.style.display = 'none';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign up</a>';
    }
};

const showError = (message) => {
    alert(`Error: ${message}`);
};

const showSuccess = (message) => {
    alert(`Success: ${message}`);
};

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(authForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const name = formData.get('name');
            
            const submitBtn = document.getElementById('authSubmitBtn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;
            
            try {
                if (name && name.trim()) {
                    await auth.signup(name, email, password);
                } else {
                    await auth.signin(email, password);
                }
                closeAuthModal();
            } catch (error) {
                console.error('Auth error:', error);
                showError(error.message || 'Authentication failed. Please try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});