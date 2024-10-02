import { useState } from "react";
import { loginModeus,  searchModeus} from "../../services/api/login";

const ModeusLoginForm = () => {
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
  // const [fullName, setName] = useState(null);


  const onClickSearch = async (fullName) => {
    let response = await searchModeus(fullName);
    // if (response.status !== 200) {
    //   alert("Бэк взорвался!");
    //   return;
    // }
    console.log(response.data)
    alert('!!!!!!!');
  };

  const onClickLogin = async () => {
    let response = await loginModeus(email, password);

    // if (response.status !== 200) {
    //   alert("Ты лох, введи правильные креды. Азамат тоже лох!");
    //   return;
    // }
    console.log(response)
    localStorage.setItem("token", response.data?.token);

  };

  return (
    <div className="login-container">
      <div>
        <input
          className="input-name"
          id="text"
          type="text"
          placeholder="ФИО для Модеуса"
          onChange={(e) => onClickSearch(e.target.value)}
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
