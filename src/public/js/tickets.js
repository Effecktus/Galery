// public/js/tickets.js
document.addEventListener('DOMContentLoaded', function () {
    const list  = document.getElementById('tickets-list');
    const noMsg = document.getElementById('no-tickets-message');
    if (!list) return;

    // Показать индикатор
    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>';
    list.style.display = 'grid';
    if (noMsg) noMsg.style.display = 'none';

    // Запросить свои билеты
    fetch('/api/v1/tickets/my-tickets')
        .then(res => res.json())
        .then(json => {
            const tickets = (json.status === 'success' && Array.isArray(json.data.tickets))
                ? json.data.tickets
                : [];

            list.innerHTML = '';
            if (!tickets.length) {
                list.style.display = 'none';
                if (noMsg) noMsg.style.display = 'block';
                return;
            }

            // Рендерим карточки
            list.style.display = 'grid';
            if (noMsg) noMsg.style.display = 'none';
            tickets.forEach(t => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.justifyContent = 'space-between';
                card.style.padding = '1rem';
                card.style.marginBottom = '1rem';

                // дата
                const booked = new Date(t.booking_date);
                const bookedStr = booked.toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                card.innerHTML = `
            <a href="/exhibitions/${t.Exhibition.id}/page" class="hover:underline text-blue-600">
  ${t.Exhibition.title}
</a>
          <div class="card-body" style="flex-grow:1;">
            <p><strong>Дата брони:</strong> ${bookedStr}</p>
            <p><strong>Кол-во билетов:</strong> ${t.quantity}</p>
            <p><strong>Стоимость:</strong> ${t.total_price} ₽</p>
            <p><strong>Период:</strong>
              ${new Date(t.Exhibition.start_date).toLocaleDateString('ru-RU')} – 
              ${new Date(t.Exhibition.end_date).toLocaleDateString('ru-RU')}
            </p>
            <p><strong>Место:</strong> ${t.Exhibition.location}</p>
          </div>
        `;
                list.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Ошибка при загрузке билетов:', err);
            list.style.display = 'none';
            if (noMsg) noMsg.style.display = 'block';
        });
});
