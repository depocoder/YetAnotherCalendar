import {useEffect, useState, useCallback} from "react";
import {useNavigate} from "react-router-dom";

import '../style/login.scss'

const LoginRoute = ({onLogin, onSearch}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(""); // Строка для поиска
    const [searchResults, setSearchResults] = useState([]); // Результаты поиска
    const [personId, setPersonId] = useState(null); // Здесь сохраняем personId
    const [showSuggestions, setShowSuggestions] = useState(false); // Флаг показа списка
    const [errorMessage, setErrorMessage] = useState(""); // Сообщение об ошибке
    // const [debounceTimeout, setDebounceTimeout] = useState(null); // Для хранения таймера

    const navigate = useNavigate(); // Инициализируем хук для навигации

    // Функция для выполнения поиска
    const onClickSearch = useCallback(async (fullName) => {
        const result = await onSearch(fullName);
        if (result.success) {
            setSearchResults(result.data);
            setShowSuggestions(true); // Показываем список после поиска
            setErrorMessage(""); // Очищаем ошибку при успешном поиске
        } else {
            setErrorMessage(result.message);
        }
    }, [onSearch]);

    // Обрабатываем изменение поля поиска с задержкой
    useEffect(() => {
        // // Очищаем предыдущий таймер, чтобы избежать лишних вызовов
        // if (debounceTimeout) {
        //     clearTimeout(debounceTimeout);
        // }

        // Устанавливаем новый таймер на 500 мс
        const newTimeout = setTimeout(() => {
            if (fullName.trim()) {
                onClickSearch(fullName); // Выполняем поиск после задержки
            }
        }, 500);

        // setDebounceTimeout(newTimeout);

        // Очищаем таймер при размонтировании или изменении fullName
        return () => clearTimeout(newTimeout);
    }, [fullName, onClickSearch]);

    // Обработчик выбора варианта из списка
    const handleSelect = (person) => {
        setFullName(person.fullName); // Устанавливаем выбранное имя
        setPersonId(person.personId); // Сохраняем personId
        localStorage.setItem('personId', personId); // Сохраняем personId localstorage
        setShowSuggestions(false); // Скрываем список после выбора
    };

    const onClickLogin = async () => {
        const result = await onLogin(email, password, personId);

        if (result.success) {
            setErrorMessage(""); // Очищаем ошибку при успешном логине
            navigate("/calendar");
        } else {
            setErrorMessage(result.message);
        }
    };

    return (
        <div className="login-container">
            <h2>Мое расписание</h2>

            <div className="login-fio">
                <label>Введите ФИО из базы Модеуса</label>

                <div style={{display: "flex", flexDirection: "column"}}>
                    <input
                        className="input-name"
                        type="text"
                        placeholder="ФИО для Модеуса"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />

                    {/* Рендерим выпадающий список или сообщение об отсутствии результатов */}
                    {showSuggestions && (
                        <ul className="suggestions-list">
                            {searchResults.length > 0 ? (
                                searchResults.map((person, index) => (
                                    <li key={index} onClick={() => handleSelect(person)}>
                                        {person.fullName}
                                    </li>
                                ))
                            ) : (
                                <li>Нет такого имени</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>

            <div className="login-netologiya">
                <label>Введите логин и пароль от Нетологии, чтобы увидеть свое расписание</label>
                <div style={{display: "flex", flexDirection: "column"}}>
                    <input
                        className="input-email"
                        type="email"
                        placeholder="Логин от Нетологии"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        className="input-email"
                        type="password"
                        placeholder="Пароль от Нетологии"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                {/* Сообщение об ошибке */}
                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <button className="login-btn-log" id="login" onClick={onClickLogin}>
                    Войти
                </button>
            </div>
        </div>
    );
};

export default LoginRoute;
