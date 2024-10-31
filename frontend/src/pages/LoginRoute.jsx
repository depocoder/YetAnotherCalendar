// import React, {useEffect, useState, useCallback} from "react";
// import {useNavigate} from "react-router-dom";
// import Select from "react-select/base";
//
// const LoginRoute = ({onLogin, onSearch}) => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [fullName, setFullName] = useState(""); // Строка для поиска
//     const [searchResults, setSearchResults] = useState([]); // Результаты поиска
//     const [personId, setPersonId] = useState(null); // Здесь сохраняем personId
//     // const [showSuggestions, setShowSuggestions] = useState(false); // Флаг показа списка
//     const [errorMessage, setErrorMessage] = useState(""); // Сообщение об ошибке
//     // const [debounceTimeout, setDebounceTimeout] = useState(null); // Для хранения таймера
//     const [inputValue] = useState(''); // Замените на это
//
//     const navigate = useNavigate(); // Инициализируем хук для навигации
//
//     // Функция для выполнения поиска
//     const onClickSearch = useCallback(async (fullName) => {
//         const result = await onSearch(fullName);
//         console.log('result', result)
//
//         if (result.success) {
//             setSearchResults(result?.data);
//             setPersonId(result?.data[0]?.personId)
//             console.log('onClickSearch personId', result?.data[0]?.personId)
//             // setShowSuggestions(true); // Показываем список после поиска
//             setErrorMessage(""); // Очищаем ошибку при успешном поиске
//         } else {
//             setErrorMessage(result.message);
//         }
//     }, [onSearch]);
//
//     // Обрабатываем изменение поля поиска с задержкой
//     useEffect(() => {
//         // // Очищаем предыдущий таймер, чтобы избежать лишних вызовов
//         // if (debounceTimeout) {
//         //     clearTimeout(debounceTimeout);
//         // }
//
//         // Устанавливаем новый таймер на 500 мс
//         const newTimeout = setTimeout(() => {
//             if (fullName.trim()) {
//                 onClickSearch(fullName); // Выполняем поиск после задержки
//             }
//         }, 500);
//
//         // setDebounceTimeout(newTimeout);
//
//         // Очищаем таймер при размонтировании или изменении fullName
//         return () => clearTimeout(newTimeout);
//     }, [fullName, onClickSearch]);
//
//     // Функция для изменения значения ввода в Select
//     // const handleInputChange = (inputValue) => {
//     //     setInputValue(inputValue); // Обновляем значение
//     //     setFullName(inputValue); // Привязываем значение к состоянию fullName
//     // };
//
//     // Обработчик выбора варианта из списка
//     // const handleSelect = (person) => {
//     //     setFullName(person.fullName); // Устанавливаем выбранное имя
//     //     // setShowSuggestions(false); // Скрываем список после выбора
//     // };
//
//      // Обработчик изменения текста в Select
//     const handleInputChange = (newValue) => {
//         setInputValue(newValue); // Обновляем значение инпута
//     };
//
//     // Обработчик выбора варианта из списка
//     const handleSelect = (selectedOption) => {
//         setFullName(selectedOption.label); // Устанавливаем выбранное имя
//         setPersonId(selectedOption.value); // Устанавливаем personId
//         console.log('Selected personId:', selectedOption.value);
//     };
//
//     const onClickLogin = async () => {
//         const result = await onLogin(email, password);
//
//         if (result.success) {
//             // setPersonId(result.data[0].personId); // Сохраняем personId
//            console.log('onClickLogin personId', personId)
//            localStorage.setItem('personId', personId); // Сохраняем personId localstorage
//
//             setErrorMessage(""); // Очищаем ошибку при успешном логине
//             navigate("/");
//         } else {
//             setErrorMessage(result.message);
//         }
//     };
//
//     return (
//         <div className="login-container">
//             <h2>Мое расписание</h2>
//
//             <div className="login-fio">
//                 <label>Введите ФИО из базы Модеуса</label>
//
//                 <div style={{display: "flex", flexDirection: "column"}}>
//                      <Select
//                          onInputChange={handleInputChange}
//                          onMenuOpen={() => console.log("Menu opened")}
//                         options={searchResults.map((person) => ({
//                             value: person.personId,
//                             label: person.fullName
//                         }))}
//                         onChange={handleSelect} // Обработчик выбора опции
//                         inputValue={inputValue} // Текущее значение ввода
//                         placeholder="Введите ФИО"
//                         noOptionsMessage={() => (inputValue ? 'Нет такого имени' : 'Введите ФИО')}
//                     />
//
//                     {/*<input*/}
//                     {/*    className="input-name"*/}
//                     {/*    type="text"*/}
//                     {/*    list="suggestions"*/}
//                     {/*    placeholder="ФИО для Модеуса"*/}
//                     {/*    value={fullName}*/}
//                     {/*    onChange={(e) => setFullName(e.target.value)}*/}
//                     {/*/>*/}
//                     {/*<datalist id="suggestions">*/}
//                     {/*    {searchResults.map((person, index) => (*/}
//                     {/*        <option key={index} value={person.fullName} onClick={() => handleSelect(person)}>*/}
//                     {/*            {person.fullName}*/}
//                     {/*        </option>*/}
//                     {/*    ))}*/}
//                     {/*</datalist>*/}
//
//                     {/*/!* Рендерим выпадающий список или сообщение об отсутствии результатов *!/*/}
//                     {/*{showSuggestions && (*/}
//                     {/*    <ul className="suggestions-list">*/}
//                     {/*        {searchResults.length > 0 ? (*/}
//                     {/*            searchResults.map((person, index) => (*/}
//                     {/*                <li key={index} onClick={() => handleSelect(person)}>*/}
//                     {/*                    {person.fullName}*/}
//                     {/*                </li>*/}
//                     {/*            ))*/}
//                     {/*        ) : (*/}
//                     {/*            <li>Нет такого имени</li>*/}
//                     {/*        )}*/}
//                     {/*    </ul>*/}
//                     {/*)}*/}
//                 </div>
//             </div>
//
//             <div className="login-netologiya">
//                 <label>Введите логин и пароль от Нетологии, чтобы увидеть свое расписание</label>
//                 <div style={{display: "flex", flexDirection: "column"}}>
//                     <input
//                         className="input-email"
//                         type="email"
//                         placeholder="Логин от Нетологии"
//                         onChange={(e) => setEmail(e.target.value)}
//                     />
//                     <input
//                         className="input-email"
//                         type="password"
//                         placeholder="Пароль от Нетологии"
//                         onChange={(e) => setPassword(e.target.value)}
//                     />
//                 </div>
//                 {/* Сообщение об ошибке */}
//                 {errorMessage && <p className="error-message">{errorMessage}</p>}
//
//                 <button className="login-btn-log" id="login" onClick={onClickLogin}>
//                     Войти
//                 </button>
//             </div>
//         </div>
//     );
// };
//
// export default LoginRoute;

//
// import { useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import Select from "react-select";
//
// const LoginRoute = ({ onLogin, onSearch }) => {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [searchResults, setSearchResults] = useState([]); // Результаты поиска
//     const [personId, setPersonId] = useState(null); // Здесь сохраняем personId
//     const [inputValue, setInputValue] = useState(''); // Контролируемое значение ввода для Select
//     const [errorMessage, setErrorMessage] = useState(""); // Сообщение об ошибке
//
//     const navigate = useNavigate(); // Инициализируем хук для навигации
//
//     // Функция для выполнения поиска
//     const onClickSearch = useCallback(async (fullName) => {
//         const result = await onSearch(fullName);
//         if (result.success) {
//             setSearchResults(result?.data);
//             setPersonId(result?.data[0]?.personId);
//             setErrorMessage(""); // Очищаем ошибку при успешном поиске
//         } else {
//             setErrorMessage(result.message);
//         }
//     }, [onSearch]);
//
//     // Функция для изменения значения ввода в Select и выполнения поиска
//     const handleInputChange = (inputValue) => {
//         setInputValue(inputValue); // Обновляем значение
//         if (inputValue.trim()) {
//             onClickSearch(inputValue); // Выполняем поиск сразу при изменении ввода
//         }
//     };
//
//     // Обработчик выбора варианта из списка
//     const handleSelect = (selectedOption) => {
//         setInputValue(selectedOption.label); // Устанавливаем выбранное имя
//         setPersonId(selectedOption.value); // Устанавливаем personId
//     };
//
//     const onClickLogin = async () => {
//         const result = await onLogin(email, password);
//
//         if (result.success) {
//             localStorage.setItem('personId', personId); // Сохраняем personId localstorage
//             setErrorMessage(""); // Очищаем ошибку при успешном логине
//             navigate("/");
//         } else {
//             setErrorMessage(result.message);
//         }
//     };
//
//     return (
//         <div className="login-container">
//             <h2>Мое расписание</h2>
//
//             <div className="login-fio">
//                 <label>Введите ФИО из базы Модеуса</label>
//
//                 <div style={{ display: "flex", flexDirection: "column" }}>
//                     <Select
//                         options={searchResults.map((person) => ({
//                             value: person.personId,
//                             label: person.fullName
//                         }))}
//                         onChange={handleSelect} // Обработчик выбора опции
//                         inputValue={inputValue} // Текущее значение ввода
//                         onInputChange={handleInputChange} // Обработчик изменения ввода
//                         placeholder="Введите ФИО"
//                         noOptionsMessage={() => (inputValue ? 'Нет такого имени' : 'Введите ФИО')}
//                     />
//                 </div>
//             </div>
//
//             <div className="login-netologiya">
//                 <label>Введите логин и пароль от Нетологии, чтобы увидеть свое расписание</label>
//                 <div style={{ display: "flex", flexDirection: "column" }}>
//                     <input
//                         className="input-email"
//                         type="email"
//                         placeholder="Логин от Нетологии"
//                         onChange={(e) => setEmail(e.target.value)}
//                     />
//                     <input
//                         className="input-email"
//                         type="password"
//                         placeholder="Пароль от Нетологии"
//                         onChange={(e) => setPassword(e.target.value)}
//                     />
//                 </div>
//                 {/* Сообщение об ошибке */}
//                 {errorMessage && <p className="error-message">{errorMessage}</p>}
//
//                 <button className="login-btn-log" id="login" onClick={onClickLogin}>
//                     Войти
//                 </button>
//             </div>
//         </div>
//     );
// };
//
// export default LoginRoute;
//
//
//
// import React, { useState, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import CustomSelect from "../components/login/CustomSelect"; // Импортируем кастомизированный Select
//
// const LoginRoute = ({ onLogin, onSearch }) => {
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [searchResults, setSearchResults] = useState([]); // Результаты поиска
//     const [personId, setPersonId] = useState(null); // Здесь сохраняем personId
//     const [errorMessage, setErrorMessage] = useState(""); // Сообщение об ошибке
//     const navigate = useNavigate(); // Инициализируем хук для навигации
//
//     // Функция для выполнения поиска
//     const onClickSearch = useCallback(async (fullName) => {
//         const result = await onSearch(fullName);
//         if (result.success) {
//             setSearchResults(result?.data);
//             setPersonId(result?.data[0]?.personId);
//             setErrorMessage(""); // Очищаем ошибку при успешном поиске
//         } else {
//             setErrorMessage(result.message);
//         }
//     }, [onSearch]);
//
//     const onClickLogin = async () => {
//         const result = await onLogin(email, password);
//         if (result.success) {
//             localStorage.setItem("personId", personId); // Сохраняем personId в localstorage
//             setErrorMessage(""); // Очищаем ошибку при успешном логине
//             navigate("/");
//         } else {
//             setErrorMessage(result.message);
//         }
//     };
//
//     return (
//         <div className="login-container">
//             <h2>Мое расписание</h2>
//
//             <div className="login-fio">
//                 <label>Введите ФИО из базы Модеуса</label>
//
//                 <div style={{ display: "flex", flexDirection: "column" }}>
//                     {/* Кастомизированный Select */}
//                     <CustomSelect
//                         options={searchResults.map((person) => ({
//                             value: person.personId,
//                             label: person.fullName
//                         }))}
//                         onChange={(selectedOption) => {
//                             setPersonId(selectedOption.value); // Устанавливаем personId
//                         }}
//                         placeholder="Введите ФИО"
//                     />
//                 </div>
//             </div>
//
//             <div className="login-netologiya">
//                 <label>Введите логин и пароль от Нетологии, чтобы увидеть свое расписание</label>
//                 <div style={{ display: "flex", flexDirection: "column" }}>
//                     <input
//                         className="input-email"
//                         type="email"
//                         placeholder="Логин от Нетологии"
//                         onChange={(e) => setEmail(e.target.value)}
//                     />
//                     <input
//                         className="input-email"
//                         type="password"
//                         placeholder="Пароль от Нетологии"
//                         onChange={(e) => setPassword(e.target.value)}
//                     />
//                 </div>
//                 {errorMessage && <p className="error-message">{errorMessage}</p>}
//
//                 <button className="login-btn-log" id="login" onClick={onClickLogin}>
//                     Войти
//                 </button>
//             </div>
//         </div>
//     );
// };
//
// export default LoginRoute;




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
                        options={searchResults.map((person) => ({
                            value: person.personId,
                            label: person.fullName
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
