import { useState } from "react";
import { loginModeus } from "../../services/api/login";

const ModeusLoginForm = () => {
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);

  const onClickLogin = async () => {
    let response = await loginModeus(email, password);

    if (response.status !== 200) {
      alert("Ты лох, введи правильные креды");
      return;
    }

    localStorage.setItem("token", response.data?.token);
  };

  return (
    <div className="login-container">
      <div>
        <input
          className="input-email"
          id="search"
          type="text"
          placeholder="ФИО для Модеуса"
        />
      </div>
      <div className="login-netologiya">
        <input
          className="input-email"
          id="email"
          type="email"
          placeholder="Логин от Нетологии"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input-email"
          id="password"
          type="password"
          placeholder="Пароль от Нетологии"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="login-btn-log" id="login" onClick={onClickLogin}>
          Войти
        </button>
      </div>
    </div>
  );
};

export default ModeusLoginForm;
