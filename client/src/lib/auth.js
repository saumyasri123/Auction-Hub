class AuthManager {
  state = {
    user: null,
    token: localStorage.getItem("auth_token"),
  };

  listeners = [];

  constructor() {
    if (this.state.token) {
      this.validateToken();
    }
  }

  async validateToken() {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${this.state.token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        this.setState({ user, token: this.state.token });
      } else {
        this.logout();
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      this.logout();
    }
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  }

  async login(email, password) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const { token, user } = await response.json();
        localStorage.setItem("auth_token", token);
        this.setState({ token, user });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }

  async signup(name, email, password, role = "buyer") {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (response.ok) {
        const { token, user } = await response.json();
        localStorage.setItem("auth_token", token);
        this.setState({ token, user });
        return true;
      }

      const { message } = await response.json().catch(() => ({}));
      throw new Error(message || "Signup failed");
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem("auth_token");
    this.setState({ token: null, user: null });
  }

  getAuthHeader() {
    return this.state.token
      ? { Authorization: `Bearer ${this.state.token}` }
      : {};
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.state); // Call immediately

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getCurrentUser() {
    return this.state.user;
  }

  isAuthenticated() {
    return this.state.token !== null && this.state.user !== null;
  }

  hasRole(role) {
    return this.state.user?.role === role;
  }
}

export const authManager = new AuthManager();
