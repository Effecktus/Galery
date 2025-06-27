document.addEventListener('DOMContentLoaded', () => {
    const startInput = document.getElementById('statStart');
    const endInput   = document.getElementById('statEnd');
    const btn        = document.getElementById('fetchStatsBtn');
    const loading    = document.getElementById('statsLoading');
    const content    = document.getElementById('statsContent');
    const emptyMsg   = document.getElementById('statsEmpty');
    const soldEl     = document.getElementById('ticketsSold');
    const revenueEl  = document.getElementById('totalRevenue');

    btn.addEventListener('click', () => {
        const start = startInput.value;
        const end   = endInput.value;
        content.style.display = 'none';
        emptyMsg.style.display = 'none';
        loading.style.display = 'block';

        const params = new URLSearchParams();
        if (start) params.append('start_date', start);
        if (end)   params.append('end_date', end);

        fetch(`/api/v1/reports/tickets?${params}`)
            .then(r => r.json())
            .then(json => {
                loading.style.display = 'none';
                if (json.status === 'success') {
                    const { tickets_sold, revenue } = json.data;
                    // Если оба = null или 0 — считаем, что нет данных
                    if ((!tickets_sold && tickets_sold !== 0) ||
                        (!revenue      && revenue !== 0)) {
                        emptyMsg.style.display = 'block';
                    } else {
                        soldEl.textContent    = tickets_sold || 0;
                        revenueEl.textContent = Number(revenue).toFixed(2);
                        content.style.display = 'block';
                    }
                } else {
                    emptyMsg.textContent = json.message || 'Нет данных';
                    emptyMsg.style.display = 'block';
                }
            })
            .catch(err => {
                console.error('Ошибка при загрузке статистики:', err);
                loading.style.display = 'none';
                emptyMsg.textContent = 'Ошибка при загрузке';
                emptyMsg.style.display = 'block';
            });
    });
});
