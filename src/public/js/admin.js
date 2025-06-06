$(document).ready(function() {
    // Обработка модальных окон
    $('[data-modal]').on('click', function() {
        const modalId = $(this).data('modal');
        $(`#${modalId}`).addClass('active');
    });

    $('.modal-close').on('click', function() {
        $(this).closest('.modal').removeClass('active');
    });

    // Закрытие модального окна при нажатии Escape
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            $('.modal').removeClass('active');
        }
    });
}); 