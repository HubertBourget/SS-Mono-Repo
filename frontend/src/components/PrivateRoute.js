// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// const PrivateRoute = ({ children }) => {
//   const { userEmail, loading } = useAuth();

//   // Wait for auth check to finish
//   if (loading) {
//     return <p>Loading...</p>;
//   }

//   // If user is not authenticated, redirect to login
//   if (!userEmail) {
//     return <Navigate to="/login" replace />;
//   }

//   // Render the protected component if user is authenticated
//   return children;
// };

// export default PrivateRoute;


import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children }) => {
  // Retrieve the token from localStorage
  const token = localStorage.getItem('sacredSound_accessToken');
  let userEmail = null;

  // If the token exists, decode it to extract user email
  if (token) {
    try {
      const decoded = jwtDecode(token); // Decode the JWT token
      userEmail = decoded?.email || null; // Safely get the email from the decoded token
    } catch (error) {
      console.error('Error decoding token:', error); // Handle decoding errors gracefully
      userEmail = null;
    }
  }

  // If no valid user email is found (i.e., user is not authenticated), redirect to login page
  if (!userEmail) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the protected route's children
  return children;
};

export default PrivateRoute;
