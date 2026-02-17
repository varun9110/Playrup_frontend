import bcrypt from "bcryptjs";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';

const Index = () => {
  const navigate = useNavigate();

  const handleEmailLogin = async (data: { email: string; phone: string; password: string }) => {
    try {
      const abcd = { ...data, password: bcrypt.hash(data.password, 10) };
      console.log("Login data submitted:", abcd);
      const res = await axios.post('http://localhost:5000/api/auth/login', data);
      const { token, ...userData } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      if (userData.role === 'superadmin') {
        navigate('/adminlanding');
      } else if (userData.role === 'academy') {
        navigate('/academy-setup');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleGoogleLogin = () => {
    // Replace this with your actual Google OAuth flow
    console.log("Google login clicked");
    alert("Google login - implement your OAuth flow here");
  };

  const handleFacebookLogin = () => {
    // Replace this with your actual Facebook OAuth flow
    console.log("Facebook login clicked");
    alert("Facebook login - implement your OAuth flow here");
  };

  return (
    <LoginPage
      onEmailLogin={handleEmailLogin}
      onGoogleLogin={handleGoogleLogin}
      onFacebookLogin={handleFacebookLogin}
    />
  );
};

export default Index;
