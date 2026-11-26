import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
export const dashboard = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})

dashboard.definition = {
    methods: ["get","head"],
    url: '/admin/ai-intelligence',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
dashboard.url = (options?: RouteQueryOptions) => {
    return dashboard.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
dashboard.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: dashboard.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
dashboard.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: dashboard.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
    const dashboardForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: dashboard.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
        dashboardForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: dashboard.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::dashboard
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
        dashboardForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: dashboard.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    dashboard.form = dashboardForm
/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
export const evaluate = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: evaluate.url(options),
    method: 'post',
})

evaluate.definition = {
    methods: ["post"],
    url: '/admin/ai-intelligence/evaluate',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
evaluate.url = (options?: RouteQueryOptions) => {
    return evaluate.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
evaluate.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: evaluate.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
    const evaluateForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: evaluate.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
        evaluateForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: evaluate.url(options),
            method: 'post',
        })
    
    evaluate.form = evaluateForm
const ai = {
    dashboard: Object.assign(dashboard, dashboard),
evaluate: Object.assign(evaluate, evaluate),
}

export default ai