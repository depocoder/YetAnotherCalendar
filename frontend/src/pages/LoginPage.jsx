import { useState } from "react";
import Login from "../components/login/login";
import PasswordPrivacyModal from "../components/PasswordPrivacyModal";
import { loginLms, getModeusPersonId, loginNetology, getNetologyCourse } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import '../style/login.scss';
import { toast } from 'react-toastify';
import { debug } from '../utils/debug';

const LoginPage = () => {
    const [isNetologyLoggedIn, setIsNetologyLoggedIn] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleNetologyLogin = async (email, password) => {
        try {
            const response = await loginNetology(email, password);

            if (response.status === 200) {
                const token = response.data["_netology-on-rails_session"];
                localStorage.setItem('token', token);
                const courseData = await getNetologyCourse(token);
                localStorage.setItem('calendarId', courseData?.id);
                setIsNetologyLoggedIn(true);
                navigate("/login/modeus");
                return { success: true };
            }

            if (response.status === 401) {
                toast.error("Неверный логин или пароль.");
                return { success: false, message: "Неверный логин или пароль." };
            }

            if (response.status === 429) {
                const detail = response.data?.detail || '';
                // Извлекаем время из английского сообщения
                const timeMatch = detail.match(/(\d+)\s+seconds?/);
                const seconds = timeMatch ? timeMatch[1] : '';
                const message = seconds 
                    ? `Слишком много попыток. Попробуйте через ${seconds} секунд.`
                    : 'Слишком много неудачных попыток. Попробуйте позже.';
                toast.error(message);
                return { success: false, message: message };
            }

            if (response.status === 400 || response.status === 422) {
                const errorMessage = "Были переданы неверные данные.";
                toast.error(
                    <div>
                        {errorMessage} <a href="/feedback" style={{color: '#7b61ff', textDecoration: 'underline'}}>Нужна помощь?</a>
                    </div>
                );
                return { success: false, message: "Неверные данные." };
            }

            // Fallback for any other 4xx/5xx errors (except 401)
            const errorMessage = response.status >= 500 
                ? "Произошла ошибка сервера. Попробуйте позже."
                : "Произошла ошибка. Попробуйте снова.";
            toast.error(
                <div>
                    {errorMessage} <a href="/feedback" style={{color: '#7b61ff', textDecoration: 'underline'}}>Нужна помощь?</a>
                </div>
            );
            return { success: false, message: "Произошла ошибка." };

        } catch (error) {
            debug.error("Ошибка при входе в Нетологию:", error);
            const networkError = "Ошибка сети. Попробуйте позже.";
            toast.error(
                <div>
                    {networkError} <a href="/feedback" style={{color: '#7b61ff', textDecoration: 'underline'}}>Нужна помощь?</a>
                </div>
            );
            return { success: false, message: "Ошибка сети." };
        }
    };

    const handleModeusLogin = async (email, password) => {
        try {
            const modeusResponse = await getModeusPersonId(email, password);
            
            if (modeusResponse.status === 429) {
                const detail = modeusResponse.data?.detail || '';
                // Извлекаем время из английского сообщения
                const timeMatch = detail.match(/(\d+)\s+seconds?/);
                const seconds = timeMatch ? timeMatch[1] : '';
                const message = seconds 
                    ? `Слишком много попыток входа в Modeus. Попробуйте через ${seconds} секунд.`
                    : 'Слишком много неудачных попыток входа в Modeus. Попробуйте позже.';
                toast.error(message);
                return { success: false };
            }

            if (modeusResponse.status === 401) {
                toast.error("Неверный логин или пароль для Modeus.");
                return { success: false };
            }
            if (modeusResponse.status === 400 || modeusResponse.status === 422) {
                toast.error("Неверные данные Modeus. Проверьте почту и пароль.");
                return { success: false };
            }
            if (modeusResponse.status >= 400) {
                toast.error("Произошла ошибка Modeus. Попробуйте позже.");
                return { success: false };
            }

            localStorage.setItem('modeus_person_id', modeusResponse.data);

            const lmsResponse = await loginLms(email, password);
            if (lmsResponse.status === 401) {
                toast.error("Неверный логин или пароль для LMS Нетологии.");
                return { success: false };
            }

            if (lmsResponse.status === 400 || lmsResponse.status === 422) {
                const errorMessage = "Неверные данные LMS. Проверьте почту.";
            toast.error(
                <div>
                    {errorMessage} <a href="/feedback" style={{color: '#7b61ff', textDecoration: 'underline'}}>Нужна помощь?</a>
                </div>
            );
                return { success: false };
            }
            if (lmsResponse.status >= 400) {
                toast.error("Произошла ошибка LMS. Попробуйте позже.");
                return { success: false };
            }

            localStorage.setItem('lms-id', lmsResponse.data.id);
            localStorage.setItem('lms-token', lmsResponse.data.token);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            navigate("/");
            return { success: true };

        } catch (error) {
            debug.error("Ошибка при входе в Modeus:", error);
            const networkError = "Ошибка сети при входе в Modeus.";
            toast.error(
                <div>
                    {networkError} <a href="/feedback" style={{color: '#7b61ff', textDecoration: 'underline'}}>Нужна помощь?</a>
                </div>
            );
            return { success: false };
        }
    };

    const isNetologyRoute = location.pathname === "/login";
    const isModeusRoute = location.pathname === "/login/modeus";

    return (
        <div className="login-container">
            <h2 className="login-container__title shedule-login">Мое расписание</h2>

            {isNetologyRoute && (
                <Login
                    key="netology"
                    onLogin={handleNetologyLogin}
                    title="Введите логин и пароль от Нетологии, чтобы увидеть свое расписание"
                    name="Нетологии"
                    formId="netology"
                />
            )}

            {isModeusRoute && isNetologyLoggedIn && (
                <Login
                    key="modeus"
                    onLogin={handleModeusLogin}
                    title="Введите логин и пароль от Модеус, чтобы увидеть lms в своем расписании"
                    name="Модеус"
                    formId="modeus"
                />
            )}

            {/* Privacy Information Section */}
            <div className="privacy-info-section">
                <div className="privacy-notice">
                    <div className="privacy-header">
                        <span className="privacy-icon">🔐</span>
                        <h3>Вопросы о безопасности?</h3>
                    </div>
                    <p>
                        Мы понимаем ваши опасения по поводу передачи паролей. &nbsp;
                        <button 
                            className="privacy-link" 
                            onClick={() => setIsPrivacyModalOpen(true)}
                        >
                            Узнайте, как мы защищаем ваши данные
                        </button>
                    </p>
                </div>
            </div>

            {/* Password Privacy Modal */}
            <PasswordPrivacyModal 
                isOpen={isPrivacyModalOpen} 
                onClose={() => setIsPrivacyModalOpen(false)} 
            />
        </div>
    );
};

export default LoginPage;
