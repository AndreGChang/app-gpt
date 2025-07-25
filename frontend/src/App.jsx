import './App.css';
import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API;

// JWT decoder helper
function jwtDecode(token) {
  return JSON.parse(atob(token.split(".")[1]));
}

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);
  return [token, setToken];
}

function Login({ setToken }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const url = isRegister ? "/api/register" : "/api/login";
      const { data } = await axios.post(API + url, { email, password });
      setToken(data.token);
      navigate("/");
    } catch (err) {
      setMsg(err.response?.data?.message || "Error");
    }
  }
  return (
    <div className="app-container">
      <h2 style={{ textAlign: "center" }}>{isRegister ? "Cadastro" : "Login"}</h2>
      <form onSubmit={submit}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button>{isRegister ? "Cadastrar" : "Entrar"}</button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)} style={{ background: "#eee", color: "#004488", marginTop: 8 }}>
        {isRegister ? "Já tem conta? Entrar" : "Criar nova conta"}
      </button>
      {msg && <div className="error">{msg}</div>}
    </div>
  );
}

function ReviewList({ token }) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    axios.get(API + "/api/reviews", { headers: { Authorization: "Bearer " + token } })
      .then(r => setReviews(r.data));
  }, [token]);
  return (
    <div>
      <h2>Book Reviews</h2>
      <Link to="/new" style={{ marginBottom: 18, display: "inline-block" }}>+ Nova Review</Link>
      <ul>
        {reviews.map(r => (
          <li key={r._id || r.id}>
            <Link to={`/review/${r._id || r.id}`}>{r.title}</Link>
            <span style={{ color: "#555", fontSize: "0.97em" }}> — {r.user?.email || r.author}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewDetail({ token }) {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(API + "/api/reviews/" + id, { headers: { Authorization: "Bearer " + token } })
      .then(r => setReview(r.data))
      .catch(() => setMsg("Review não encontrada"));
  }, [id, token]);

  if (!review) return <div style={{ margin: 20 }}>{msg || "Carregando..."}</div>;

  const myId = jwtDecode(token).id || jwtDecode(token)._id;
  const reviewUser = review.user?._id || review.user?.id || review.user || review.user_id;

  return (
    <div>
      <h2>{review.title}</h2>
      <p style={{ fontWeight: 500, color: "#888" }}>por {review.user?.email || review.author}</p>
      {review.image && (
        <img src={API + "/uploads/" + review.image} alt="" />
      )}
      <p>{review.description}</p>
      {reviewUser === myId && (
        <div style={{ marginTop: 16 }}>
          <Link to={`/edit/${review._id || review.id}`} style={{ marginRight: 12 }}>Editar</Link>
          <button
            style={{ background: "#ffe2e6", color: "#b71c1c" }}
            onClick={async () => {
              await axios.delete(API + "/api/reviews/" + id, { headers: { Authorization: "Bearer " + token } });
              navigate("/");
            }}
          >Excluir</button>
        </div>
      )}
      <br />
      <Link to="/">← Voltar</Link>
    </div>
  );
}

function ReviewForm({ token, edit }) {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (edit) {
      axios.get(API + "/api/reviews/" + id, { headers: { Authorization: "Bearer " + token } })
        .then(r => {
          setTitle(r.data.title);
          setDescription(r.data.description);
        });
    }
  }, [edit, id, token]);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    if (image) form.append("image", image);
    try {
      if (edit) {
        await axios.put(API + "/api/reviews/" + id, form, { headers: { Authorization: "Bearer " + token } });
      } else {
        await axios.post(API + "/api/reviews", form, { headers: { Authorization: "Bearer " + token } });
      }
      navigate("/");
    } catch (err) {
      setMsg("Erro ao salvar review");
    }
  }

  return (
    <div>
      <h2>{edit ? "Editar Review" : "Nova Review"}</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} required />
        <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
        <button>{edit ? "Salvar" : "Publicar"}</button>
      </form>
      <Link to="/" style={{ marginTop: 16 }}>← Voltar</Link>
      {msg && <div className="error">{msg}</div>}
    </div>
  );
}

function App() {
  const [token, setToken] = useAuth();

  function logout() {
    setToken(null);
  }

  if (!token) return <Login setToken={setToken} />;

  return (
    <div className="app-container">
      <header>
        <h1><Link to="/">Book Review</Link></h1>
        <button onClick={logout}>Sair</button>
      </header>
      <Routes>
        <Route path="/" element={<ReviewList token={token} />} />
        <Route path="/new" element={<ReviewForm token={token} edit={false} />} />
        <Route path="/edit/:id" element={<ReviewForm token={token} edit={true} />} />
        <Route path="/review/:id" element={<ReviewDetail token={token} />} />
        <Route path="*" element={<div style={{ padding: 24 }}>Página não encontrada</div>} />
      </Routes>
    </div>
  );
}

export default App;
