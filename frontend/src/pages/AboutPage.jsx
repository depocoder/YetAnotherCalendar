import React, { useState, useEffect } from 'react';
import FeedbackModal from '../components/FeedbackModal';
import '../style/about.scss';

const AboutPage = () => {
    const [commits, setCommits] = useState(null);
    const [commitsError, setCommitsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    const fetchCommits = async () => {
        setIsLoading(true);
        setCommitsError(false);
        
        try {
            // Single API request to get all workflow runs for the repository
            const response = await fetch('https://api.github.com/repos/depocoder/YetAnotherCalendar/actions/runs?branch=main&per_page=50');
            if (!response.ok) throw new Error('Failed to fetch workflow runs');
            
            const workflowData = await response.json();
            const workflowRuns = workflowData.workflow_runs || [];
            
            // Group workflow runs by commit SHA
            const workflowsByCommit = {};
            workflowRuns.forEach(run => {
                if (!workflowsByCommit[run.head_sha]) {
                    workflowsByCommit[run.head_sha] = run;
                }
            });
            
            // Get unique commits from workflow runs (last 5)
            const uniqueCommits = [];
            const seenShas = new Set();
            
            for (const run of workflowRuns) {
                if (!seenShas.has(run.head_sha) && uniqueCommits.length < 5) {
                    seenShas.add(run.head_sha);
                    const commitMessage = run.head_commit.message;
                    const messageLines = commitMessage.split('\n').filter(line => line.trim());
                    
                    uniqueCommits.push({
                        sha: run.head_sha.substring(0, 7),
                        fullSha: run.head_sha,
                        title: messageLines[0] || '',
                        description: messageLines.slice(1).join('\n').trim() || '',
                        date: new Date(run.head_commit.timestamp),
                        author: run.head_commit.author.name,
                        authorEmail: run.head_commit.author.email,
                        avatar: run.actor?.avatar_url,
                        githubUsername: run.actor?.login,
                        url: `https://github.com/depocoder/YetAnotherCalendar/commit/${run.head_sha}`,
                        deploymentStatus: {
                            state: run.conclusion || run.status,
                            workflowName: run.name,
                            runId: run.id,
                            htmlUrl: run.html_url
                        }
                    });
                }
            }
            
            setCommits(uniqueCommits);
        } catch (error) {
            console.error('Failed to fetch commits:', error);
            setCommitsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCommits();
    }, []);

    const formatCommitDate = (date) => {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'только что';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} мин назад`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ч назад`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} дн назад`;
        
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getDeploymentStatusInfo = (deploymentStatus) => {
        if (!deploymentStatus) {
            return { icon: '⚪', text: 'Нет данных', className: 'unknown' };
        }

        // Handle GitHub Actions workflow status
        if (deploymentStatus.workflowName) {
            switch (deploymentStatus.state) {
                case 'success':
                    return { icon: '🚀', text: 'Развернуто', className: 'success', workflow: deploymentStatus.workflowName };
                case 'failure':
                    return { icon: '💥', text: 'Сбой сборки', className: 'failure', workflow: deploymentStatus.workflowName };
                case 'cancelled':
                    return { icon: '🛑', text: 'Отменено', className: 'cancelled', workflow: deploymentStatus.workflowName };
                case 'in_progress':
                    return { icon: '⚡', text: 'Выполняется', className: 'pending', workflow: deploymentStatus.workflowName };
                case 'queued':
                    return { icon: '⚡', text: 'В очереди', className: 'pending', workflow: deploymentStatus.workflowName };
                case 'requested':
                    return { icon: '⚡', text: 'Запрошено', className: 'pending', workflow: deploymentStatus.workflowName };
                default:
                    return { icon: '❓', text: deploymentStatus.state, className: 'unknown', workflow: deploymentStatus.workflowName };
            }
        }

        // Handle legacy status API
        switch (deploymentStatus.state) {
            case 'success':
                return { icon: '🚀', text: 'Успешно', className: 'success' };
            case 'pending':
                return { icon: '⚡', text: 'В процессе', className: 'pending' };
            case 'failure':
                return { icon: '💥', text: 'Ошибка', className: 'failure' };
            case 'error':
                return { icon: '💥', text: 'Сбой', className: 'error' };
            default:
                return { icon: '❓', text: 'Неизвестно', className: 'unknown' };
        }
    };

    return (
        <div className="about-page">
            {/* Hero Section */}
            <section className="about-hero">
                <div className="about-hero-content">
                    <h1>🗓️ YetAnotherCalendar</h1>
                    <p className="about-hero-subtitle">
                        Объединяем все ваши учебные события в одном удобном календаре
                    </p>
                    <p className="about-hero-description">
                        Превосходная альтернатива календарям Modeus и Нетологии с расширенными возможностями 
                        и лучшим пользовательским опытом. Интеграция с множественными образовательными платформами 
                        в едином интерфейсе.
                    </p>
                    <div className="about-hero-actions">
                        <button 
                            className="hero-btn primary"
                            onClick={() => window.open('https://github.com/depocoder/YetAnotherCalendar', '_blank')}
                        >
                            ⭐ GitHub
                        </button>
                        <button 
                            className="hero-btn secondary"
                            onClick={() => window.location.href = '/'}
                        >
                            🚀 Попробовать
                        </button>
                    </div>
                </div>
            </section>

            {/* Core Features Section */}
            <section className="about-section">
                <div className="about-container">
                    <h2>🚀 Основные возможности</h2>
                    <div className="features-grid-large">
                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">🔗</span>
                                <h3>Мультиплатформенная интеграция</h3>
                            </div>
                            <p>
                                Полная интеграция с <strong>Modeus</strong>, <strong>LMS</strong> и <strong>Нетологией</strong>. 
                                Все ваши события, дедлайны и расписание из разных систем объединены в одном календаре.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Автоматическая синхронизация событий</li>
                                <li>✅ Единая авторизация для всех платформ</li>
                                <li>✅ Умная категоризация по источникам</li>
                            </ul>
                        </div>

                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">⚡</span>
                                <h3>Молниеносная производительность</h3>
                            </div>
                            <p>
                                Система построена на <strong>FastAPI</strong> с <strong>Redis кэшированием</strong> 
                                для максимальной скорости загрузки и отзывчивости интерфейса.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Асинхронная архитектура Python</li>
                                <li>✅ Интеллектуальное кэширование</li>
                                <li>✅ Оптимизированные запросы к базе данных</li>
                            </ul>
                        </div>

                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">📤</span>
                                <h3>Экспорт и синхронизация</h3>
                            </div>
                            <p>
                                Экспорт в формат <strong>.ics</strong> для использования в любом календарном приложении. 
                                Синхронизация с Google Calendar, Apple Calendar и другими.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Стандартный формат iCalendar</li>
                                <li>✅ Автоматическое обновление событий</li>
                                <li>✅ Поддержка всех календарных приложений</li>
                            </ul>
                        </div>

                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">🔐</span>
                                <h3>Корпоративная безопасность</h3>
                            </div>
                            <p>
                                Защита на уровне предприятия: <strong>JWT токены</strong>, ограничение скорости запросов, 
                                защита от брутфорса и безопасная аутентификация.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Защита от атак методом перебора</li>
                                <li>✅ Лимитирование запросов (Rate Limiting)</li>
                                <li>✅ Безопасное хранение сессий</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Admin Features Section */}
            <section className="about-section alt">
                <div className="about-container">
                    <h2>👨‍🏫 Возможности для преподавателей</h2>
                    <div className="admin-features">
                        <div className="admin-feature">
                            <span className="admin-icon">🔒</span>
                            <div>
                                <h4>Панель администратора</h4>
                                <p>Защищенная панель для преподавателей с возможностью управления расписанием студентов</p>
                            </div>
                        </div>
                        <div className="admin-feature">
                            <span className="admin-icon">👥</span>
                            <div>
                                <h4>Система донорских аккаунтов</h4>
                                <p>Безопасный доступ к расписанию студентов через донорские учетные записи</p>
                            </div>
                        </div>
                        <div className="admin-feature">
                            <span className="admin-icon">🛠️</span>
                            <div>
                                <h4>Аналитика и мониторинг</h4>
                                <p>Комплексное логирование, отслеживание ошибок и мониторинг производительности</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology Stack Section */}
            <section className="about-section">
                <div className="about-container">
                    <h2>🛠️ Технологический стек</h2>
                    <div className="tech-grid">
                        <div className="tech-category">
                            <h4>Backend</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge python">Python 3.12+</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge fastapi">FastAPI</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge pydantic">Pydantic v2</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge redis">Redis</span>
                                </div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>Frontend</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge react">React</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge scss">SCSS</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge responsive">Responsive</span>
                                </div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>DevOps</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge docker">Docker</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge uv">uv</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge github">GitHub Actions</span>
                                </div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>Качество кода</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge mypy">mypy</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge ruff">Ruff</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge pytest">pytest</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* API & Documentation Section */}
            <section className="about-section alt">
                <div className="about-container">
                    <h2>📚 API и документация</h2>
                    <div className="api-features">
                        <div className="api-card">
                            <h4>🎯 Swagger UI</h4>
                            <p>Интерактивная документация API с возможностью тестирования эндпоинтов в реальном времени</p>
                            <code>/api/docs</code>
                        </div>
                        <div className="api-card">
                            <h4>📖 ReDoc</h4>
                            <p>Красивая статическая документация API с подробными описаниями всех методов</p>
                            <code>/api/redoc</code>
                        </div>
                        <div className="api-card">
                            <h4>🔗 RESTful API</h4>
                            <p>Полноценный REST API для интеграции с внешними системами и разработки мобильных приложений</p>
                            <code>JSON/HTTP</code>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy & Security Section */}
            <section className="about-section">
                <div className="about-container">
                    <h2>🛡️ Приватность и безопасность</h2>
                    <div className="security-grid">
                        <div className="security-item">
                            <span className="security-icon">🔐</span>
                            <h4>Никакой телеметрии</h4>
                            <p>Мы не собираем ваши личные данные и не отслеживаем активность. Полное уважение к приватности пользователей.</p>
                        </div>
                        <div className="security-item">
                            <span className="security-icon">🔒</span>
                            <h4>Безопасное хранение</h4>
                            <p>Пароли и токены не сохраняются. Все данные аутентификации передаются напрямую в соответствующие системы.</p>
                        </div>
                        <div className="security-item">
                            <span className="security-icon">🌍</span>
                            <h4>Открытый код</h4>
                            <p>Полностью открытый исходный код - вы можете убедиться в безопасности и внести свой вклад в развитие проекта.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contributing Section */}
            <section className="about-section alt">
                <div className="about-container">
                    <h2>🤝 Как помочь проекту</h2>
                    <div className="contributing-options">
                        <div className="contrib-card">
                            <span className="contrib-icon">⭐</span>
                            <h4>Поставьте звезду</h4>
                            <p>Самый простой способ поддержать проект - поставить звезду на GitHub</p>
                        </div>
                        <div className="contrib-card" onClick={() => setIsFeedbackModalOpen(true)}>
                            <span className="contrib-icon">🐛</span>
                            <h4>Сообщите об ошибке</h4>
                            <p>Нашли баг? Сообщите нам через GitHub или Telegram сообщество</p>
                        </div>
                        <div className="contrib-card">
                            <span className="contrib-icon">💡</span>
                            <h4>Предложите идею</h4>
                            <p>Есть предложения по улучшению? Поделитесь своими идеями через GitHub Discussions</p>
                        </div>
                        <div className="contrib-card">
                            <span className="contrib-icon">👨‍💻</span>
                            <h4>Внесите код</h4>
                            <p>Хотите участвовать в разработке? Создайте Pull Request с вашими улучшениями</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Latest Commits Section */}
            {!commitsError && (
                <section className="about-section commits-section">
                    <div className="about-container">
                        <h2>🔄 Последние обновления</h2>
                        <p className="section-subtitle">
                            Следите за актуальными изменениями в проекте
                        </p>
                        
                        {commits && !isLoading ? (
                            <div className="commits-container">
                                {commits.map((commit, index) => {
                                    const deploymentInfo = getDeploymentStatusInfo(commit.deploymentStatus);
                                    return (
                                        <div key={commit.fullSha} className={`commit-card ${index === 0 ? 'latest' : ''}`}>
                                            <div className="commit-header">
                                                <div className="commit-author">
                                                    {commit.avatar && (
                                                        <div className="commit-avatar-wrapper">
                                                            <img 
                                                                src={commit.avatar} 
                                                                alt={commit.author}
                                                                className="commit-avatar"
                                                            />
                                                            {index === 0 && <div className="latest-badge">Последний</div>}
                                                        </div>
                                                    )}
                                                    <div className="commit-author-info">
                                                        <div className="commit-author-name">
                                                            {commit.githubUsername ? (
                                                                <a 
                                                                    href={`https://github.com/${commit.githubUsername}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="author-link"
                                                                >
                                                                    @{commit.githubUsername}
                                                                </a>
                                                            ) : (
                                                                commit.author
                                                            )}
                                                        </div>
                                                        <div className="commit-meta">
                                                            <span className="commit-date">
                                                                {formatCommitDate(commit.date)}
                                                            </span>
                                                            <span className="commit-sha">
                                                                <a 
                                                                    href={commit.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="commit-link"
                                                                    title="Открыть коммит на GitHub"
                                                                >
                                                                    {commit.sha}
                                                                </a>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {commit.deploymentStatus && (
                                                    <div className={`deployment-status ${deploymentInfo.className}`}>
                                                        {commit.deploymentStatus.htmlUrl ? (
                                                            <a 
                                                                href={commit.deploymentStatus.htmlUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="status-link"
                                                                title={deploymentInfo.workflow ? `Workflow: ${deploymentInfo.workflow}` : 'Открыть в GitHub'}
                                                            >
                                                                <span className="status-icon">{deploymentInfo.icon}</span>
                                                                <span className="status-text">{deploymentInfo.text}</span>
                                                            </a>
                                                        ) : (
                                                            <>
                                                                <span className="status-icon">{deploymentInfo.icon}</span>
                                                                <span className="status-text">{deploymentInfo.text}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="commit-content">
                                                <div className="commit-title">{commit.title}</div>
                                                {commit.description && (
                                                    <div className="commit-description">
                                                        <div className="description-header">
                                                            <span>Подробности</span>
                                                        </div>
                                                        <div className="description-text">{commit.description}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                <div className="commits-footer">
                                    <a 
                                        href="https://github.com/depocoder/YetAnotherCalendar/commits/main"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-all-commits"
                                    >
                                        Посмотреть все коммиты →
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="commit-loading">
                                <div className="loading-spinner"></div>
                                <p>Загружаем информацию о последних коммитах...</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Footer */}
            <section className="about-footer">
                <div className="about-container">
                    <div className="footer-content">
                        <div className="footer-info">
                            <h4>YetAnotherCalendar</h4>
                            <p>Создано студентами для студентов 💜</p>
                        </div>
                        <div className="footer-links">
                            <a href="https://github.com/depocoder/YetAnotherCalendar" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                            <a href="https://github.com/depocoder/YetAnotherCalendar/issues" target="_blank" rel="noopener noreferrer">
                                Issues
                            </a>
                            <a href="/" className="footer-home">
                                ← Вернуться к календарю
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feedback Modal */}
            <FeedbackModal 
                isOpen={isFeedbackModalOpen} 
                onClose={() => setIsFeedbackModalOpen(false)} 
            />
        </div>
    );
};

export default AboutPage;