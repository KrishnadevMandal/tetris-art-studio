import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6">Tetris Art Studio</h1>
        <button
          onClick={handleGoogleLogin}
          className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-500"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
};

export default Login;