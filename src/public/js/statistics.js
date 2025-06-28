$(document).ready(function() {
    const $startInput = $('#statStart');
    const $endInput   = $('#statEnd');
    const $btn        = $('#fetchStatsBtn');
    const $loading    = $('#statsLoading');
    const $content    = $('#statsContent');
    const $emptyMsg   = $('#statsEmpty');
    const $soldEl     = $('#ticketsSold');
    const $revenueEl  = $('#totalRevenue');

    $btn.on('click', function() {
        const start = $startInput.val();
        const end   = $endInput.val();
        $content.hide();
        $emptyMsg.hide();
        $loading.show();

        const params = new URLSearchParams();
        if (start) params.append('start_date', start);
        if (end)   params.append('end_date', end);

        $.ajax({
            url: `/api/v1/reports/tickets?${params}`,
            method: 'GET',
            dataType: 'json',
            success: function(json) {
                $loading.hide();
                if (json.status === 'success') {
                    const { tickets_sold, revenue } = json.data;
                    if ((!tickets_sold && tickets_sold !== 0) || (!revenue && revenue !== 0)) {
                        $emptyMsg.show();
                    } else {
                        $soldEl.text(tickets_sold || 0);
                        $revenueEl.text(Number(revenue).toFixed(2));
                        $content.show();
                    }
                } else {
                    $emptyMsg.text(json.message || 'Нет данных').show();
                }
            },
            error: function(err) {
                console.error('Ошибка при загрузке статистики:', err);
                $loading.hide();
                $emptyMsg.text('Ошибка при загрузке').show();
            }
        });
    });
});
