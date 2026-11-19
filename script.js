const STORAGE_KEY = "meubolso_v1";

let data = {
    transactions: [],
    goals: [],
    budgets: [],
    banks: []
};

// Carregar dados salvos
function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            data = {
                transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
                goals: Array.isArray(parsed.goals) ? parsed.goals : [],
                budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
                banks: Array.isArray(parsed.banks) ? parsed.banks : []
            };
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function today() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
        .toISOString().split("T")[0];
}

function currentMonthTransactions() {
    const month = today().slice(0, 7);

    return data.transactions.filter(item =>
        item.date && item.date.slice(0, 7) === month
    );
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("selected");
    });

    const index = {
        dashboard: 0,
        transactions: 1,
        goals: 2,
        reports: 3,
        banks: 4
    }[pageId];

    if (index !== undefined) {
        document.querySelectorAll(".nav-item")[index]
            .classList.add("selected");
    }

    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Cálculos financeiros
function calculate() {
    let income = 0;
    let expense = 0;

    data.transactions.forEach(item => {
        if (item.type === "income") {
            income += item.amount;
        } else {
            expense += item.amount;
        }
    });

    return {
        income,
        expense,
        balance: income - expense
    };
}

// Dashboard
function renderDashboard() {
    const totals = calculate();

    document.getElementById("totalBalance").textContent =
        money(totals.balance);

    document.getElementById("totalIncome").textContent =
        money(totals.income);

    document.getElementById("totalExpense").textContent =
        money(totals.expense);

    const recent = [...data.transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    const container = document.getElementById("recentTransactions");

    if (!recent.length) {
        container.innerHTML =
            '<div class="empty">Nenhuma movimentação cadastrada.</div>';
    } else {
        container.innerHTML = recent.map(item => `
            <div class="transaction">
                <div class="transaction-info">
                    <strong>${escapeHTML(item.description)}</strong>
                    <small>${escapeHTML(item.category)} • ${item.date}</small>
                </div>
                <span class="transaction-value ${item.type === "income" ? "income" : "expense"}">
                    ${item.type === "income" ? "+" : "-"} ${money(item.amount)}
                </span>
            </div>
        `).join("");
    }

    const goalsContainer = document.getElementById("dashboardGoals");

    if (!data.goals.length) {
        goalsContainer.innerHTML =
            '<div class="empty">Você ainda não possui metas.</div>';
    } else {
        goalsContainer.innerHTML = data.goals.slice(0, 3).map(goal => {
            const percent = Math.min(
                100,
                goal.target > 0 ? goal.saved / goal.target * 100 : 0
            );

            return `
                <div class="goal-card">
                    <strong>${escapeHTML(goal.name)}</strong>
                    <p class="muted">
                        ${money(goal.saved)} de ${money(goal.target)}
                    </p>
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${percent}%"></div>
                    </div>
                </div>
            `;
        }).join("");
    }
}

// Histórico de movimentações
function renderTransactions() {
    const container = document.getElementById("allTransactions");

    const items = [...data.transactions]
        .sort((a, b) => b.date.localeCompare(a.date));

    if (!items.length) {
        container.innerHTML =
            '<div class="empty">Seu histórico está vazio.</div>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="transaction">
            <div class="transaction-info">
                <strong>${escapeHTML(item.description)}</strong>
                <small>${escapeHTML(item.category)} • ${item.date}</small>
                <span class="transaction-value ${item.type === "income" ? "income" : "expense"}">
                    ${item.type === "income" ? "+" : "-"} ${money(item.amount)}
                </span>
            </div>
            <button class="delete-button"
                onclick="deleteTransaction('${item.id}')">
                Excluir
            </button>
        </div>
    `).join("");
}

document.getElementById("transactionDate").value = today();

document.getElementById("transactionForm")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        const description =
            document.getElementById("description").value.trim();

        const amount = Number(
            document.getElementById("amount").value
        );

        const type = document.getElementById("type").value;
        const category = document.getElementById("category").value;
        const date = document.getElementById("transactionDate").value;

        if (!description || !Number.isFinite(amount) ||
            amount <= 0 || !date || date > today()) {
            alert("Confira os dados da movimentação.");
            return;
        }

        data.transactions.push({
            id: crypto.randomUUID(),
            description,
            amount,
            type,
            category,
            date
        });

        saveData();
        this.reset();
        document.getElementById("transactionDate").value = today();

        renderAll();

        alert("Movimentação adicionada!");
    });

function deleteTransaction(id) {
    if (!confirm("Deseja excluir esta movimentação?")) return;

    data.transactions = data.transactions.filter(
        item => item.id !== id
    );

    saveData();
    renderAll();
}

// Metas financeiras
document.getElementById("goalForm")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        const name = document.getElementById("goalName")
            .value.trim();

        const target = Number(
            document.getElementById("goalTarget").value
        );

        if (!name || !Number.isFinite(target) || target <= 0) {
            alert("Informe uma meta válida.");
            return;
        }

        data.goals.push({
            id: crypto.randomUUID(),
            name,
            target,
            saved: 0
        });

        saveData();
        this.reset();
        renderAll();

        alert("Meta criada com sucesso!");
    });

function renderGoals() {
    const container = document.getElementById("goalsList");

    if (!data.goals.length) {
        container.innerHTML =
            '<div class="empty">Nenhuma meta criada ainda.</div>';
        return;
    }

    container.innerHTML = data.goals.map(goal => {
        const percent = Math.min(
            100,
            goal.saved / goal.target * 100
        );

        return `
            <div class="goal-card">
                <strong>${escapeHTML(goal.name)}</strong>
                <p class="muted">
                    Guardado: ${money(goal.saved)}
                </p>
                <p class="muted">
                    Objetivo: ${money(goal.target)}
                </p>

                <div class="progress-track">
                    <div class="progress-fill"
                        style="width:${percent}%"></div>
                </div>

                <strong>${percent.toFixed(1)}%</strong>

                <div class="goal-actions">
                    <button onclick="addToGoal('${goal.id}')">
                        + Contribuir
                    </button>
                    <button onclick="deleteGoal('${goal.id}')">
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function addToGoal(id) {
    const goal = data.goals.find(item => item.id === id);
    if (!goal) return;

    const value = Number(
        prompt("Quanto deseja adicionar à meta? (R$)")
    );

    if (!Number.isFinite(value) || value <= 0) return;

    goal.saved += value;

    saveData();
    renderAll();
}

function deleteGoal(id) {
    if (!confirm("Excluir esta meta?")) return;

    data.goals = data.goals.filter(goal => goal.id !== id);

    saveData();
    renderAll();
}

// Orçamento mensal
document.getElementById("budgetForm")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        const category =
            document.getElementById("budgetCategory").value;

        const limit = Number(
            document.getElementById("budgetLimit").value
        );

        if (!Number.isFinite(limit) || limit <= 0) {
            alert("Informe um orçamento válido.");
            return;
        }

        const existing = data.budgets.find(item =>
            item.category === category
        );

        if (existing) {
            existing.limit = limit;
        } else {
            data.budgets.push({
                id: crypto.randomUUID(),
                category,
                limit
            });
        }

        saveData();
        this.reset();
        renderAll();

        alert("Orçamento salvo!");
    });

function renderBudgets() {
    const container = document.getElementById("budgetsList");
    const monthly = currentMonthTransactions();

    if (!data.budgets.length) {
        container.innerHTML =
            '<div class="empty">Nenhum orçamento definido.</div>';
        return;
    }

    container.innerHTML = data.budgets.map(budget => {
        const spent = monthly
            .filter(item =>
                item.type === "expense" &&
                item.category === budget.category
            )
            .reduce((sum, item) => sum + item.amount, 0);

        const percent = Math.min(
            100,
            spent / budget.limit * 100
        );

        return `
            <div class="budget-card">
                <strong>${escapeHTML(budget.category)}</strong>
                <p class="muted">
                    Gasto: ${money(spent)} / ${money(budget.limit)}
                </p>

                <div class="progress-track">
                    <div class="progress-fill"
                        style="width:${percent}%"></div>
                </div>

                <p class="muted">
                    ${percent.toFixed(1)}% utilizado
                </p>

                ${spent > budget.limit
                    ? '<p class="expense">Limite ultrapassado!</p>'
                    : '<p class="income">Dentro do orçamento.</p>'
                }

                <button class="delete-button"
                    onclick="deleteBudget('${budget.id}')">
                    Excluir orçamento
                </button>
            </div>
        `;
    }).join("");
}

function deleteBudget(id) {
    if (!confirm("Excluir este orçamento?")) return;

    data.budgets = data.budgets.filter(
        item => item.id !== id
    );

    saveData();
    renderAll();
}

// Relatórios
function renderReports() {
    const monthly = currentMonthTransactions();

    const income = monthly
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expense = monthly
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    document.getElementById("reportIncome").textContent =
        money(income);

    document.getElementById("reportExpense").textContent =
        money(expense);

    document.getElementById("reportResult").textContent =
        money(income - expense);

    const categories = {};

    monthly.filter(item => item.type === "expense")
        .forEach(item => {
            categories[item.category] =
                (categories[item.category] || 0) + item.amount;
        });

    const total = Object.values(categories)
        .reduce((sum, value) => sum + value, 0);

    const container = document.getElementById("categoryReport");

    if (!total) {
        container.innerHTML =
            '<div class="empty">Sem despesas registradas neste mês.</div>';
        return;
    }

    container.innerHTML = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, value]) => {
            const percent = value / total * 100;

            return `
                <div class="report-row">
                    <div>
                        <strong>${escapeHTML(category)}</strong>
                        <span>${money(value)}</span>
                    </div>
                    <div class="report-bar">
                        <div style="width:${percent}%"></div>
                    </div>
                    <small class="muted">${percent.toFixed(1)}%</small>
                </div>
            `;
        }).join("");
}

// Contas bancárias simuladas
function renderBanks() {
    const container = document.getElementById("bankList");

    if (!data.banks.length) {
        container.innerHTML =
            '<div class="empty">Nenhuma conta de demonstração conectada.</div>';
        return;
    }

    container.innerHTML = data.banks.map(bank => `
        <div class="bank-account">
            <strong>${escapeHTML(bank.name)}</strong>
            <p class="muted">
                ${escapeHTML(bank.status)}
            </p>
            <p>${money(bank.balance)}</p>
            <small class="muted">
                Conta demonstrativa
            </small>
        </div>
    `).join("");
}

function simulateBank() {
    const banks = [
        "Banco de Demonstração A",
        "Banco de Demonstração B",
        "Banco de Demonstração C"
    ];

    const name = prompt(
        "Escolha uma instituição:\n" +
        banks.map((bank, i) => ${i + 1} - ${bank}).join("\n")
    );

    const index = Number(name) - 1;

    if (!Number.isInteger(index) ||
        index < 0 || index >= banks.length) {
        return;
    }

    const alreadyConnected = data.banks.some(
        bank => bank.name === banks[index]
    );

    if (alreadyConnected) {
        alert("Esta conta já está cadastrada.");
        return;
    }

    data.banks.push({
        id: crypto.randomUUID(),
        name: banks[index],
        status: "Conectada (simulação)",
        balance: 0
    });

    saveData();
    renderAll();

    alert("Conta demonstrativa adicionada!");
}

// Atualização geral
function renderAll() {
    renderDashboard();
    renderTransactions();
    renderGoals();
    renderBudgets();
    renderReports();
    renderBanks();
}

// Inicialização
loadData();

document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("pt-BR");

renderAll();