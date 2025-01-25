function raise404(res, detail){
    res.status(404)
    res.json({
        detail : detail
    })
    return
}

module.exports = {
    raise404
}