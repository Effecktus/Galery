// public/js/tickets.js
$(document).ready(function () {
    const $list  = $('#tickets-list');
    const $noMsg = $('#no-tickets-message');
    const $modal = $('#cancel-ticket-modal');
    const $cancelBtn = $('#cancel-confirmation-btn');
    const $confirmBtn = $('#confirm-cancel-btn');
    
    if (!$list.length) return;

    // Переменная для хранения ID билета для отмены
    let ticketToCancel = null;

    // Показать индикатор
    $list.html('<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>');
    $list.css('display', 'grid');
    if ($noMsg.length) $noMsg.hide();

    // Функция для закрытия модального окна
    function closeCancelModal() {
        $modal.hide();
        ticketToCancel = null;
    }

    // Обработчики для модального окна
    $cancelBtn.on('click', closeCancelModal);
    
    // Закрытие модального окна при клике вне его
    $(window).on('click', function(event) {
        if (event.target === $modal[0]) {
            closeCancelModal();
        }
    });

    // Функция для отмены билета
    function cancelTicket(ticketId) {
        $.ajax({
            url: `/api/v1/tickets/${ticketId}`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            success: function(json) {
                if (json.status === 'success') {
                    // Удаляем карточку билета из DOM
                    $(`[data-ticket-id="${ticketId}"]`).remove();
                    
                    // Проверяем, остались ли еще билеты
                    const remainingTickets = $list.find('.card');
                    if (remainingTickets.length === 0) {
                        $list.hide();
                        if ($noMsg.length) $noMsg.show();
                    }
                    
                    closeCancelModal();
                    
                    // Показываем уведомление об успешной отмене
                    alert('Билет успешно отменен');
                } else {
                    alert(json.message || 'Ошибка при отмене билета');
                }
            },
            error: function(err) {
                console.error('Ошибка при отмене билета:', err);
                alert('Ошибка при отмене билета');
            }
        });
    }

    // Обработчик подтверждения отмены
    $confirmBtn.on('click', function() {
        if (ticketToCancel) {
            cancelTicket(ticketToCancel);
        }
    });

    // Функция для показа модального окна подтверждения
    function showCancelConfirmation(ticket) {
        ticketToCancel = ticket.id;
        
        // Показываем модальное окно
        $modal.css('display', 'flex');
    }

    // Запросить свои билеты
    $.ajax({
        url: '/api/v1/tickets/my-tickets',
        method: 'GET',
        dataType: 'json',
        success: function(json) {
            const tickets = (json.status === 'success' && Array.isArray(json.data.tickets))
                ? json.data.tickets
                : [];

            $list.empty();
            if (!tickets.length) {
                $list.hide();
                if ($noMsg.length) $noMsg.show();
                return;
            }

            // Рендерим карточки
            $list.css('display', 'grid');
            if ($noMsg.length) $noMsg.hide();
            
            tickets.forEach(t => {
                const $card = $('<div>').addClass('card').attr('data-ticket-id', t.id).css({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    marginBottom: '1rem'
                });

                // дата
                const booked = new Date(t.booking_date);
                const bookedStr = booked.toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                const cardHTML = `
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
                
                $card.html(cardHTML);
                
                // Добавляем обработчик для кнопки отмены
                $card.find('.cancel-ticket-btn').on('click', function() {
                    showCancelConfirmation(t);
                });
                
                $list.append($card);
            });
        },
        error: function(err) {
            console.error('Ошибка при загрузке билетов:', err);
            $list.hide();
            if ($noMsg.length) $noMsg.show();
        }
    });
});
