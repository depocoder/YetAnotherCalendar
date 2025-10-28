import { useState } from "react";
import Login from "../components/login/login";
import PasswordPrivacyModal from "../components/PasswordPrivacyModal";
import { loginLms, getModeusPersonId, loginNetology, getNetologyCourse } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import '../style/login.scss';
import { toast } from 'react-toastify';
import { debug } from '../utils/debug';
import { handleApiError } from '../utils/errorHandler';

const LoginPage = () => {
    const [isNetologyLoggedIn, setIsNetologyLoggedIn] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleNetologyLogin = async (email, password) => {
        let response; // Define response here to be available in catch
        try {
            response = await loginNetology(email, password);

            if (response.status === 200) {
                const token = response.data["_netology-on-rails_session"];
                localStorage.setItem('token', token);
                const courseData = await getNetologyCourse(token);
                localStorage.setItem('calendarId', courseData?.id);
                setIsNetologyLoggedIn(true);
                navigate("/login/modeus");
                return { success: true };
            }

            // --- Keep specific error messages ---
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
            
            // --- 2. USE HANDLER FOR GENERIC API ERRORS ---
            // Catches 400, 422, 500, 503, etc.
            debug.error("Ошибка API Нетологии:", response);
            handleApiError({ response: response }, "Ошибка при входе в Нетологию", navigate);
            return { success: false, message: "Произошла ошибка." };

        } catch (error) {
            // --- 3. USE HANDLER FOR NETWORK/JS ERRORS ---
            debug.error("Ошибка при входе в Нетологию:", error);
            // 'error' is a real Error object, so we pass it directly
            handleApiError(error, "Ошибка при входе в Нетологию", navigate);
            return { success: false, message: "Ошибка сети." };
        }
    };

    const handleModeusLogin = async (email, password) => {
        if (!email.includes("@") || email.split("@").length - 1 !== 1) {
            toast.error("Email должен содержать один символ @.");
            return { success: false };
        }

        let [name, mail] = email.split("@");
        if (mail === "utmn.ru") {
            mail = "study.utmn.ru";
        }
        if (mail !== "study.utmn.ru") {
            toast.error("Email должен содержать @study.utmn.ru.");
            return { success: false };
        }
        email = `${name}@${mail}`;

        try {
            const modeusResponse = await getModeusPersonId(email, password);
            
            // --- Keep specific Modeus error messages ---
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
            // --- Use handler for other Modeus errors (like 500) ---
            if (modeusResponse.status >= 400) { 
                debug.error("Ошибка API Modeus:", modeusResponse);
                 handleApiError({ response: modeusResponse }, "Ошибка при входе в Modeus", navigate);
                return { success: false };
            }

            localStorage.setItem('modeus_person_id', modeusResponse.data);

            // --- Keep specific LMS error messages ---
            const lmsResponse = await loginLms(email, password);
            if (lmsResponse.status === 401) {
                toast.error("Неверный логин или пароль для LMS Нетологии.");
                return { success: false };
            }
            if (lmsResponse.status === 400 || lmsResponse.status === 422) {
                toast.error("Неверные данные LMS. Проверьте почту.");
                return { success: false };
            }
            // --- Use handler for other LMS errors (like 500) ---
            if (lmsResponse.status >= 400) {
                debug.error("Ошибка API LMS:", lmsResponse);
                handleApiError({ response: lmsResponse }, "Ошибка при входе в LMS", navigate);
                return { success: false };
            }

            localStorage.setItem('lms-id', lmsResponse.data.id);
            localStorage.setItem('lms-token', lmsResponse.data.token);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            navigate("/");
            return { success: true };

        } catch (error) {
            // --- 3. USE HANDLER FOR NETWORK/JS ERRORS ---
            debug.error("Ошибка при входе в Modeus/LMS:", error);
            handleApiError(error, "Ошибка при входе в Modeus или LMS", navigate);
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