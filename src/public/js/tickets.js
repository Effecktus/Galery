// public/js/tickets.js
document.addEventListener('DOMContentLoaded', function () {
    const list  = document.getElementById('tickets-list');
    const noMsg = document.getElementById('no-tickets-message');
    const modal = document.getElementById('cancel-ticket-modal');
    const cancelBtn = document.getElementById('cancel-confirmation-btn');
    const confirmBtn = document.getElementById('confirm-cancel-btn');
    
    if (!list) return;

    // Переменная для хранения ID билета для отмены
    let ticketToCancel = null;

    // Показать индикатор
    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>';
    list.style.display = 'grid';
    if (noMsg) noMsg.style.display = 'none';

    // Функция для закрытия модального окна
    function closeCancelModal() {
        modal.style.display = 'none';
        ticketToCancel = null;
    }

    // Обработчики для модального окна
    cancelBtn.addEventListener('click', closeCancelModal);
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeCancelModal();
        }
    });

    // Функция для отмены билета
    function cancelTicket(ticketId) {
        fetch(`/api/v1/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(res => res.json())
        .then(json => {
            if (json.status === 'success') {
                // Удаляем карточку билета из DOM
                const ticketCard = document.querySelector(`[data-ticket-id="${ticketId}"]`);
                if (ticketCard) {
                    ticketCard.remove();
                }
                
                // Проверяем, остались ли еще билеты
                const remainingTickets = list.querySelectorAll('.card');
                if (remainingTickets.length === 0) {
                    list.style.display = 'none';
                    if (noMsg) noMsg.style.display = 'block';
                }
                
                closeCancelModal();
                
                // Показываем уведомление об успешной отмене
                alert('Билет успешно отменен');
            } else {
                alert(json.message || 'Ошибка при отмене билета');
            }
        })
        .catch(err => {
            console.error('Ошибка при отмене билета:', err);
            alert('Ошибка при отмене билета');
        });
    }

    // Обработчик подтверждения отмены
    confirmBtn.addEventListener('click', function() {
        if (ticketToCancel) {
            cancelTicket(ticketToCancel);
        }
    });

    // Функция для показа модального окна подтверждения
    function showCancelConfirmation(ticket) {
        ticketToCancel = ticket.id;
        
        // Показываем модальное окно
        modal.style.display = 'flex';
    }

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
                card.setAttribute('data-ticket-id', t.id);
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
          <div class="card-footer" style="margin-top: 1rem; text-align: center;">
            <button type="button" class="btn btn-danger cancel-ticket-btn" style="width: 100%;">
              Отменить билет
            </button>
          </div>
        `;
                
                // Добавляем обработчик для кнопки отмены
                const cancelButton = card.querySelector('.cancel-ticket-btn');
                cancelButton.addEventListener('click', function() {
                    showCancelConfirmation(t);
                });
                
                list.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Ошибка при загрузке билетов:', err);
            list.style.display = 'none';
            if (noMsg) noMsg.style.display = 'block';
        });
});
