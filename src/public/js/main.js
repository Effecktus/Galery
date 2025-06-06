// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const alertDiv = $('<div>', {
        class: `alert alert-${type} alert-dismissible fade show`,
        html: `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `
    });
    
    $('main').prepend(alertDiv);
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Функция для форматирования даты
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}

// Функция для форматирования цены
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(price);
}

// Инициализация при загрузке страницы
$(document).ready(function() {
    // Обработка AJAX форм
    $('form[data-ajax="true"]').on('submit', function(e) {
        e.preventDefault();
        
        const form = $(this);
        const formData = new FormData(this);
        const submitButton = form.find('[type="submit"]');
        const originalButtonText = submitButton.html();
        
        submitButton.prop('disabled', true).html('Загрузка...');
        
        $.ajax({
            url: form.attr('action'),
            method: form.attr('method'),
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                showNotification(data.message || 'Операция выполнена успешно');
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                showNotification(response?.message || 'Произошла ошибка', 'danger');
            },
            complete: function() {
                submitButton.prop('disabled', false).html(originalButtonText);
            }
        });
    });

    // Обработка кнопки выхода
    $('a[data-action="logout"]').on('click', function(e) {
        e.preventDefault();
        window.location.href = '/auth/logout';
    });

    // Обработка мобильного меню
    $('.menu-toggle').on('click', function() {
        $('.main-nav').toggleClass('active');
    });
});

// Функция для загрузки изображений с предпросмотром
function handleImageUpload(input, previewElement) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
        };
        
        reader.readAsDataURL(input.files[0]);
    }
} 