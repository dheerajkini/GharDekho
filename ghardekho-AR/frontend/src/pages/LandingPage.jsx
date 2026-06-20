import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { playPageTransitionSound } from "../utils/audioHelper";

export default function LandingPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("ghardekho_active_user") || "null"));
  
  // Inline login wall states
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!emailOrPhone.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("ghardekho_users") || "[]");

    if (isLogin) {
      const user = users.find(
        (u) =>
          (u.email === emailOrPhone.trim() || u.number === emailOrPhone.trim()) &&
          u.password === password
      );

      if (!user) {
        setError("Invalid email/number or password.");
        return;
      }

      setSuccess("Logged in successfully! 🎉");
      localStorage.setItem("ghardekho_active_user", JSON.stringify(user));
      
      playPageTransitionSound();
      setIsAnimatingOut(true);
      setTimeout(() => {
        setCurrentUser(user);
        setIsAnimatingOut(false);
      }, 750);
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const isEmail = emailOrPhone.includes("@");
      const exists = users.some(
        (u) =>
          u.email === emailOrPhone.trim() ||
          u.number === emailOrPhone.trim()
      );

      if (exists) {
        setError("An account with this email/number already exists.");
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        email: isEmail ? emailOrPhone.trim() : "",
        number: !isEmail ? emailOrPhone.trim() : "",
        password: password,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem("ghardekho_users", JSON.stringify(users));

      setSuccess("Account created successfully! Please log in. 🔑");
      setTimeout(() => {
        setIsLogin(true);
        setPassword(newUser.password);
        setEmailOrPhone(isEmail ? newUser.email : newUser.number);
        setError("");
        setSuccess("");
      }, 1500);
    }
  };

  // If no user session exists or transitioning, show the inline login wall
  if (!currentUser || isAnimatingOut) {
    return (
      <div className="page-transition animated-bg" style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        position: "relative",
        background: "radial-gradient(circle at center, #0f0c29, #302b63, #24243e)",
        overflow: "hidden",
        transition: "opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1), transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isAnimatingOut ? 0 : 1,
        transform: isAnimatingOut ? "scale(1.1) translateY(-20px)" : "scale(1) translateY(0)"
      }}>
        {/* Glow blobs */}
        <div style={{position:"absolute",top:"-10%",left:"-10%",width:"600px",height:"600px",background:"radial-gradient(circle, rgba(108,92,231,0.25) 0%, transparent 75%)",borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-10%",right:"-10%",width:"600px",height:"600px",background:"radial-gradient(circle, rgba(0,184,148,0.2) 0%, transparent 75%)",borderRadius:"50%",pointerEvents:"none"}}/>

        {/* Auth Card */}
        <div style={{
          background: "rgba(15, 15, 30, 0.65)",
          backdropFilter: "blur(25px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px",
          padding: "40px",
          width: "90%",
          maxWidth: "420px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(108, 92, 231, 0.15)",
          zIndex: 10,
        }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <span style={{ fontSize: "2.8rem" }}>🏠</span>
            <h1 style={{
              marginTop: "12px",
              fontSize: "2rem",
              fontWeight: "900",
              background: "linear-gradient(90deg, #a29bfe, #6c5ce7, #00b894)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px"
            }}>GharDekho</h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.86rem", marginTop: "4px" }}>
              Log in to explore AR Room Design & Vastu advisor
            </p>
          </div>

          {error && (
            <div style={{
              background: "rgba(225, 112, 85, 0.15)",
              border: "1px solid #ff7675",
              borderRadius: "12px",
              padding: "12px",
              color: "#ff7675",
              fontSize: "0.84rem",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div style={{
              background: "rgba(0, 184, 148, 0.15)",
              border: "1px solid #00b894",
              borderRadius: "12px",
              padding: "12px",
              color: "#00b894",
              fontSize: "0.84rem",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.7)",
                marginBottom: "6px",
                fontWeight: 600
              }}>Email Address or Phone Number</label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="name@email.com or +9198765..."
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={e => { e.target.style.borderColor = "#6c5ce7"; e.target.style.boxShadow = "0 0 10px rgba(108,92,231,0.2)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.7)",
                marginBottom: "6px",
                fontWeight: 600
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={e => { e.target.style.borderColor = "#6c5ce7"; e.target.style.boxShadow = "0 0 10px rgba(108,92,231,0.2)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={{
                  display: "block",
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: "6px",
                  fontWeight: 600
                }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: "0.92rem",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocus={e => { e.target.style.borderColor = "#6c5ce7"; e.target.style.boxShadow = "0 0 10px rgba(108,92,231,0.2)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            )}

            <button
              type="submit"
              style={{
                padding: "15px",
                background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(108,92,231,0.45)",
                transition: "all 0.2s",
                marginTop: "10px"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-1.5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(108,92,231,0.55)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(108,92,231,0.45)";
              }}
            >
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div style={{
            textAlign: "center",
            fontSize: "0.86rem",
            marginTop: "24px",
            color: "rgba(255,255,255,0.5)"
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              style={{
                color: "#a29bfe",
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              {isLogin ? "Sign Up" : "Log In"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition animated-bg" style={{
      minHeight:"100vh",
      color:"#fff",
      fontFamily:"'Segoe UI', system-ui, sans-serif",
      overflow:"hidden",
      position:"relative",
    }}>

      {/* Glow blobs */}
      <div style={{position:"absolute",top:"-20%",left:"-10%",width:"600px",height:"600px",background:"radial-gradient(circle, rgba(108,92,231,0.3) 0%, transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-20%",right:"-10%",width:"500px",height:"500px",background:"radial-gradient(circle, rgba(0,184,148,0.2) 0%, transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"40%",right:"20%",width:"300px",height:"300px",background:"radial-gradient(circle, rgba(162,155,254,0.15) 0%, transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>

      {/* Navbar */}
      <nav style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"20px 48px",
        borderBottom:"1px solid rgba(255,255,255,0.08)",
        backdropFilter:"blur(20px)",
        position:"relative", zIndex:10,
      }}>
        <div style={{
          fontSize:"1.4rem", fontWeight:"800",
          background:"linear-gradient(90deg, #a29bfe, #6c5ce7, #00b894)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>🏠 GharDekho</div>

        <div style={{display:"flex", alignItems:"center", gap:"16px"}}>
          <span style={{
            fontSize: "0.82rem",
            color: "#a29bfe",
            fontWeight: "700",
            background: "rgba(162,155,254,0.1)",
            border: "1px solid rgba(162,155,254,0.25)",
            padding: "6px 12px",
            borderRadius: "20px"
          }}>
            👤 {currentUser.email || currentUser.number}
          </span>
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to log out?")) {
                localStorage.removeItem("ghardekho_active_user");
                playPageTransitionSound();
                setCurrentUser(null);
              }
            }}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "20px",
              color: "rgba(255,255,255,0.6)",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: "700",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#ff7675"; e.currentTarget.style.color = "#ff7675"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            Log Out
          </button>

        </div>

      </nav>

      {/* Hero */}
      <div style={{
        textAlign:"center",
        padding:"100px 20px 80px",
        position:"relative", zIndex:10,
      }}>
        {/* Badge */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:"8px",
          padding:"6px 16px",
          background:"rgba(108,92,231,0.15)",
          border:"1px solid rgba(108,92,231,0.3)",
          borderRadius:"20px", fontSize:"0.82rem", color:"#a29bfe",
          marginBottom:"28px",
        }}>
          ✨ AI-Powered Interior Design
        </div>

        <h1 style={{
          fontSize:"clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight:"800", lineHeight:1.15,
          marginBottom:"20px",
          background:"linear-gradient(135deg, #fff 0%, #a29bfe 50%, #00b894 100%)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>
          Design Your Room<br />Before You Buy
        </h1>

        <p style={{
          color:"rgba(255,255,255,0.6)",
          fontSize:"1.1rem", maxWidth:"480px",
          margin:"0 auto 48px", lineHeight:1.7,
        }}>
          Visualize furniture in your room using AI and 3D tools.
          Never buy the wrong size again.
        </p>

        {/* CTA Buttons */}
        <div style={{display:"flex", gap:"16px", justifyContent:"center", flexWrap:"wrap"}}>
          <button onClick={()=>{ playPageTransitionSound(); navigate("/design"); }} style={{
            padding:"18px 48px",
            background:"linear-gradient(135deg, #6c5ce7, #a29bfe)",
            border:"none", borderRadius:"14px", color:"#fff",
            fontWeight:"700", cursor:"pointer", fontSize:"1.1rem",
            boxShadow:"0 8px 32px rgba(108,92,231,0.5)",
            transition:"all 0.2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 12px 40px rgba(108,92,231,0.6)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(108,92,231,0.5)";}}
          >
            🎨 Go to Studio →
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display:"flex", gap:"48px", justifyContent:"center",
          marginTop:"72px", flexWrap:"wrap",
        }}>
          {[
            ["2D + 3D", "Visualization"],
            ["AI", "Powered"],
            ["Free", "Forever"],
            ["📱", "Mobile Ready"],
          ].map(([val, label])=>(
            <div key={label} style={{textAlign:"center"}}>
              <div style={{fontSize:"1.6rem", fontWeight:"800", color:"#a29bfe"}}>{val}</div>
              <div style={{color:"rgba(255,255,255,0.4)", fontSize:"0.82rem", marginTop:"4px"}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{
        padding:"60px 48px",
        maxWidth:"960px", margin:"0 auto",
        position:"relative", zIndex:10,
      }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",
          gap:"16px",
        }}>
          {[
            { icon:"📐", title:"2D Floor Plan", desc:"Drag & drop furniture on a realistic floor plan with dimensions", color:"#6c5ce7" },
            { icon:"🧊", title:"3D Room View", desc:"See your room in full 3D with real furniture shapes and lighting", color:"#00b894" },
            { icon:"✨", title:"AI Layouts", desc:"Get 3 AI-designed interior layouts tailored to your room size", color:"#fdcb6e" },
          ].map(f=>(
            <div key={f.title}
              style={{
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:"16px", padding:"24px",
                transition:"all 0.25s", cursor:"default",
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.background="rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor=f.color+"66";
                e.currentTarget.style.transform="translateY(-4px)";
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.background="rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";
                e.currentTarget.style.transform="translateY(0)";
              }}
            >
              <div style={{
                width:"44px", height:"44px", borderRadius:"12px",
                background:f.color+"22", border:`1px solid ${f.color}44`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1.4rem", marginBottom:"14px",
              }}>{f.icon}</div>
              <h3 style={{fontSize:"1rem", marginBottom:"8px", color:"#fff"}}>{f.title}</h3>
              <p style={{color:"rgba(255,255,255,0.5)", fontSize:"0.85rem", lineHeight:1.6}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop:"1px solid rgba(255,255,255,0.06)",
        padding:"20px", textAlign:"center",
        color:"rgba(255,255,255,0.25)", fontSize:"0.8rem",
        position:"relative", zIndex:10,
      }}>
        GharDekho — Built for IDPBL 🎓
      </div>
    </div>
  );
}