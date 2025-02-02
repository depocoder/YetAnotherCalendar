import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";

const LoginRoute = ({ onLogin, onSearch }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [searchResults, setSearchResults] = useState([]); // Результаты поиска
    const [personId, setPersonId] = useState(null); // Здесь сохраняем personId
    const [inputValue, setInputValue] = useState(''); // Контролируемое значение ввода для Select
    const [errorMessage, setErrorMessage] = useState(""); // Сообщение об ошибке

    const navigate = useNavigate(); // Инициализируем хук для навигации

    // Функция для выполнения поиска
    const onClickSearch = useCallback(async (fullName) => {
        const result = await onSearch(fullName);
        if (result.success) {
            setSearchResults(result?.data);
            setPersonId(result?.data[0]?.personId);
            setErrorMessage(""); // Очищаем ошибку при успешном поиске
        } else {
            setErrorMessage(result.message);
        }
    }, [onSearch]);

    // Функция для изменения значения ввода в Select и выполнения поиска
    const handleInputChange = (inputValue) => {
        setInputValue(inputValue); // Обновляем значение
        if (inputValue.trim()) {
            onClickSearch(inputValue); // Выполняем поиск сразу при изменении ввода
        }
    };

    // Обработчик выбора варианта из списка
    const handleSelect = (selectedOption) => {
        setInputValue(selectedOption.label); // Устанавливаем выбранное имя
        setPersonId(selectedOption.value); // Устанавливаем personId
    };

    const onClickLogin = async () => {
        const result = await onLogin(email, password);

        if (result.success) {
            localStorage.setItem('personId', personId); // Сохраняем personId localstorage
            setErrorMessage(""); // Очищаем ошибку при успешном логине
            navigate("/");
        } else {
            setErrorMessage(result.message);
        }
    };

    return (
        <div className="login-container">
            <h2>Мое расписание</h2>

            <div className="login-fio">
                <label>Введите ФИО из базы Модеуса</label>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <Select
                        styles={{
                            control: (provided) => ({
                                ...provided,
                                width: 320, // Устанавливаем ширину
                            }),
                        }}
                        options={searchResults?.map((person) => ({
                            value: person?.personId,
                            label: person?.fullName
                        }))}
                        onChange={handleSelect} // Обработчик выбора опции
                        inputValue={inputValue} // Текущее значение ввода
                        onInputChange={handleInputChange} // Обработчик изменения ввода
                        placeholder="Введите ФИО"
                        noOptionsMessage={() => (inputValue ? 'Нет такого имени' : 'Введите ФИО')}
                    />
                </div>
            </div>

            <div className="login-netologiya">
                <label>Введите логин и пароль от Нетологии, чтобы увидеть свое расписание</label>
                <div style={{ display: "flex", flexDirection: "column" }}>
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
